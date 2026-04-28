const BlockType = require('../../extension-support/block-type');

class Scratch3CustomBlocks {
    constructor (runtime) {
        this.runtime = runtime;
    }

    getInfo () {
        return {
            id: 'custom',
            name: 'My Custom Category',
            blocks: [
                {
                    opcode: 'myBlock',
                    blockType: BlockType.REPORTER,
                    text: 'my reporter block'
                },
                {
                    opcode: 'myCommand',
                    blockType: BlockType.COMMAND,
                    text: 'my command block'
                }
            ]
        };
    }

    myBlock () {
        return 'result';
    }

    myCommand () {
        // logic here
    }
}

module.exports = Scratch3CustomBlocks;