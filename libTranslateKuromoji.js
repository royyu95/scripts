// sl=ja
// tl=en
(function () {
    var sourceLanguage, targetLanguage;

    // Kuromoji tokenizer loader
    let kuromojiReady = null;
    let tokenizer = null;

    async function tokenize(str) {
        await loadKuromoji();
        if (!tokenizer) throw new Error('Kuromoji tokenizer not loaded');
        return tokenizer.tokenize(str);
    }

    function init(sl, tl) {
        setSrc(sl);
        setDst(tl);
    }

    // mode: "translate" (default) or "tokenize"
    async function translate(str, sl, tl) {
        await loadKuromoji();
        return tokenize(str);
    }

    function createRequest(str, sl, tl) {
        return fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "qwen3:8b",
                prompt: promptPrefix + str,
                stream: false,
                think: false
            })
        });
    }

    function setSrc(v) {
        sourceLanguage = typeof v === 'string' ? v : 'ja';
    }
    function setDst(v) {
        targetLanguage = (typeof v === 'string' && v !== 'auto') ? v : 'en';
    }

    if (typeof module !== 'undefined') {
        module.exports = { init, translate, setSrc, setDst, createRequest };
    } else {
        init();
        globalThis._init = init;
        globalThis._trans = translate;
    }
})();