'use strict';

class Scratch3AIBlocks {
    constructor(runtime) {
        this.runtime = runtime;
        this._answer = '';
        this._ready = false;
    }

    getPrimitives() {
        return {
            ai_ask:       this.askAI.bind(this),
            ai_answer:    this.getAnswer.bind(this),
            ai_translate: this.translate.bind(this),
            ai_isready:   this.isReady.bind(this)
        };
    }

    askAI(args) {
        this._ready = false;
        const prompt = args.PROMPT;

        return fetch('https://api-kamu.com/ask-codelab', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        })
        .then(res => res.json())
        .then(data => {
            this._answer = data.result;
            this._ready = true;
        });
    }

    getAnswer() {
        return this._answer;
    }

    translate(args) {
        const text = args.TEXT;
        const language = args.LANGUAGE;

        return fetch('https://api-kamu.com/translate-codelab', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, language })
        })
        .then(res => res.json())
        .then(data => data.result);
    }

    isReady() {
        return this._ready;
    }
}

module.exports = Scratch3AIBlocks;