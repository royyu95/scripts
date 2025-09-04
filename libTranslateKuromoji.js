// sl=ja
// tl=en
(function () {
    var sourceLanguage, targetLanguage;
    var kuromoji, tokenizer;
    function init(sl, tl) {
        kuromoji = require("./kuromoji.js");
        kuromoji.builder({ dicPath: "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/" }).build(function (err, builttokenizer) {
            // tokenizer is ready
            tokenizer = builttokenizer;
        });
        setSrc(sl);
        setDst(tl);
    }

    function translate(str, sl, tl) {
        return createRequest(str, sl, tl);
    }

    function createRequest(str, sl, tl) {
        var result = tokenizer.tokenize(str);
        // console.log(result);
        var resultString = "";
        result.forEach(function (element) {
            if (element.reading)
                resultString += element.reading + " ";
            else
                resultString += element.surface_form + " ";
        });
        return Promise.resolve(resultString);
    }

    function setSrc(v) {
        sourceLanguage = typeof v === 'string' ? v : 'ja';
    }

    function setDst(v) {
        targetLanguage = (typeof v === 'string' && v !== 'auto') ? v : 'en';
    }

    if (typeof module !== 'undefined') {
        module.exports = { init, translate, setSrc, setDst, createRequest };
    }
    else {
        init();
        globalThis._init = init;
        globalThis._trans = translate;
    }
})();