/* global io */

class Scratch3AIBlocks {
    constructor (runtime) {
        this.runtime = runtime;
        this._answer = '';
        this._ready = false;
        this._isFetching = false;
        this._socket = null;
        this._connectSocket();
    }

    getPrimitives () {
        return {
            ai_ask: this.askAI.bind(this),
            ai_answer: this.getAnswer.bind(this),
            ai_translate: this.translate.bind(this),
            ai_isready: this.isReady.bind(this),
            tts: this.speak.bind(this)
        };
    }

    _connectSocket () {
        if (typeof io === 'undefined') {
            console.error('[TTS] socket.io not loaded');
            return;
        }

        this._socket = io('https://glowbie-be-398118799500.asia-southeast1.run.app');

        this._socket.on('connect', () => {
            console.log('[TTS] Connected to TTS server');
        });

        this._socket.on('disconnect', () => {
            console.warn('[TTS] Disconnected from TTS server');
        });
    }

    askAI (args) {
        if (this._isFetching) return;

        this._ready = false;
        this._isFetching = true;
        const prompt = args.PROMPT;

        return fetch('https://glowbie-be-398118799500.asia-southeast1.run.app/ask-codelab', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({prompt})
        })
            .then(res => res.json())
            .then(data => {
                this._answer = data.result;
                this._ready = true;
                this._isFetching = false;
            })
            .catch(err => {
                console.error('[AI] Error:', err);
                this._isFetching = false;
            });
    }

    getAnswer () {
        return this._answer;
    }

    translate (args) {
        const text = args.TEXT;
        const language = args.LANGUAGE;

        return fetch('https://glowbie-be-398118799500.asia-southeast1.run.app/translate-codelab', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text, language})
        })
            .then(res => res.json())
            .then(data => data.result);
    }

    isReady () {
        return this._ready;
    }

    speak (args) {
        const text = args.TEXT;
        const lang = args.LANG || 'en';
        const voiceActor = args.VOICE || 'Chirp3-HD-Aoede';

        return new Promise(resolve => {
            if (!this._socket || !this._socket.connected) {
                console.error('[TTS] Socket not connected');
                return resolve();
            }

            const audioChunks = [];

            const onAudioChunk = base64Data => {
                const binary = atob(base64Data);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                audioChunks.push(bytes.buffer);
            };

            const onDone = () => {
                this._socket.off('audio_chunk', onAudioChunk);
                this._socket.off('synthesis_done', onDone);
                this._socket.off('error', onError); // eslint-disable-line no-use-before-define
                if (audioChunks.length === 0) return resolve();

                const totalLength = audioChunks.reduce((sum, buf) => sum + buf.byteLength, 0);
                const merged = new Uint8Array(totalLength);
                let offset = 0;
                for (const buf of audioChunks) {
                    merged.set(new Uint8Array(buf), offset);
                    offset += buf.byteLength;
                }

                const AudioContext = window.AudioContext || window.webkitAudioContext;
                const audioCtx = new AudioContext();

                audioCtx.decodeAudioData(merged.buffer)
                    .then(decoded => {
                        const source = audioCtx.createBufferSource();
                        source.buffer = decoded;
                        source.connect(audioCtx.destination);
                        source.onended = () => resolve();
                        source.start();
                    })
                    .catch(err => {
                        console.error('[TTS] Audio playback error:', err);
                        resolve();
                    });
            };

            const onError = err => {
                this._socket.off('audio_chunk', onAudioChunk);
                this._socket.off('synthesis_done', onDone);
                this._socket.off('error', onError);
                console.error('[TTS] Server error:', err);
                resolve();
            };

            this._socket.on('audio_chunk', onAudioChunk);
            this._socket.on('synthesis_done', onDone);
            this._socket.on('error', onError);

            this._socket.emit('synthesize_chunk', {
                text,
                lang,
                voice_actor: voiceActor
            });
        });
    }
}

module.exports = Scratch3AIBlocks;
