class Scratch3AIBlocks {
    constructor (runtime) {
        this.runtime = runtime;
        this._answer = '';
        this._ready = false;
        this._isFetching = false;
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

    // askAI (args) {
    //     this._ready = false;
    //     const prompt = args.PROMPT;

    //     return fetch('https://glowbie-be-398118799500.asia-southeast1.run.app/ask-codelab', {
    //         method: 'POST',
    //         headers: {'Content-Type': 'application/json'},
    //         body: JSON.stringify({prompt})
    //     })
    //         .then(res => res.json())
    //         .then(data => {
    //             this._answer = data.result;
    //             this._ready = true;
    //         });
    // }

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
                console.error('AI Error:', err);
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

        return new Promise(resolve => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onend = () => resolve();
            utterance.onerror = () => resolve();
            window.speechSynthesis.speak(utterance);
        });
    }
}

module.exports = Scratch3AIBlocks;
