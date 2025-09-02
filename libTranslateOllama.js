// sl=ja
// tl=en
(function () {
    var sourceLanguage, targetLanguage;
    var promptPrefix = "我在玩日语版的游戏，顺便学日语，我会给你一段游戏文本，你帮我分析这段日语文本中值得关注的语法和单词，单词写上假名注音，\
            并且把整段话翻译成中文。我已经通过了JLPT的N1级别考试，所以一些特别简单基础的语法和单词就不用分析指出了。文本如下：\n";
    function init(sl, tl) {
        setSrc(sl);
        setDst(tl);
    }

    function translate(str, sl, tl) {
        return createRequest(str, sl, tl)
            .then(r => r.json())
            .then(v => {
                return v.response;
            });
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
        })
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