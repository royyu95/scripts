// sl=ja
// tl=en
(function () {
    var sourceLanguage, targetLanguage;
    var kuromoji, tokenizer, MDX, path, mdict;
    const veryEasyWords = ["する", "ある", "いる", "です", "なる", "ない", "おる", "くる", "行く", "来る", "あげる", "もらう", "やる", "できる", "見る", 
        "言う", "それ", "これ", "あれ", "私", "あなた", "人", "もの", "こと", "時", "所", "中", "前", "後", "誰", "何", "どこ", "どう", "いつ", "の", 
        "ん", "なに", "いい", "よい", "大きい", "小さい", "新しい", "古い", "長い", "短い", "高い", "低い", "多い", "少ない", "良い", "悪い", 
        "俺", "おれ", "僕", "ぼく", "あたし", "わたし", "あんた", "あなたたち", "みんな", "皆", "全部", "何か", "誰か", "どこか", "いつか",];

    function init(sl, tl) {
        kuromoji = require("./kuromoji.js");
        kuromoji.builder({ dicPath: "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/" }).build(function (err, builttokenizer) {
            // tokenizer is ready
            tokenizer = builttokenizer;
        });
        MDX = require("./js-mdict/dist/cjs/mdx.js").MDX;
        path = require("path");
        const mdxPath = path.join(__dirname, "./mdx/DJS.mdx");
        mdict = new MDX(mdxPath);
        
        setSrc(sl);
        setDst(tl);
    }

    function extractMeanings(definition, maxCount = 5) {
        let html = definition.replace(/\r?\n/g, '');

        const mgRegex = /<MG[^>]*>(.*?)<\/MG>/g;
        let meanings = [];
        let match;
        while ((match = mgRegex.exec(html)) !== null) {
            let mgContent = match[1];

            // 跳过 class="C" 的补充内容
            if (/class="C"/.test(mgContent)) continue;

            const meaningRegex = /<meaning[^>]*>(.*?)<\/meaning>/g;
            let meaningMatch;
            while ((meaningMatch = meaningRegex.exec(mgContent)) !== null) {
                let text = meaningMatch[1];

                // 去掉所有 HTML 标签
                text = text.replace(/<[^>]+>/g, '');
                text = text.replace(/^\s+|\s+$/g, '');
                if (text) meanings.push(text);

                if (meanings.length >= maxCount) break;
            }

            if (meanings.length >= maxCount) break;
        }

        // 如果超过 maxCount，加省略号
        if (meanings.length === maxCount) {
            meanings[maxCount - 1] += '……';
        }

        return meanings.map((m, i) => `${i + 1}. ${m}`).join('\n');
    }

    function translate(str, sl, tl) {
        return createRequest(str, sl, tl);
    }

    function lookupWithLink(word) {
        let def = mdict.lookup(word);
        if (!def.definition) return null;

        // 检查是否是 @@@LINK
        if (def.definition.startsWith('@@@LINK=')) {
            const target = def.definition.replace('@@@LINK=', '').replace(/\r/g, "").replace(/\u0000/g, "").trim();
            // console.log(`Redirecting ${word} -> ${target}`);
            return mdict.lookup(target);
        }

        return def;
    }
    
    function createRequest(str, sl, tl) {
        var result = tokenizer.tokenize(str);
        var resultString = "";
        var furigana = "";
        var definitions = [];

        result.forEach(function (element) {
            // console.log(element);
            if (element.reading) {
                furigana += element.reading + " ";
            }
            else {
                furigana += element.surface_form + " ";
                return; 
            }
            if (element.pos && (element.pos === "名詞" || element.pos === "動詞" || element.pos === "形容詞" || element.pos === "副詞")) {
                if (veryEasyWords.indexOf(element.basic_form) !== -1) {
                    return;
                }
                var def = lookupWithLink(element.basic_form);
                if (def && definitions.findIndex(d => d.keyText === def.keyText) === -1) {
                    definitions.push(def);
                }
            }
        });
        definitions.forEach(function (def) {
            // console.log(def.definition);
            resultString += def.keyText + ":\n" + extractMeanings(def.definition) + "\n\n";
        });
        resultString += "【仮名】：\n" + furigana + "\n\n";
        return Promise.resolve(resultString);
    }

    function setSrc(v) {
        sourceLanguage = typeof v === "string" ? v : "ja";
    }

    function setDst(v) {
        targetLanguage = (typeof v === "string" && v !== "auto") ? v : "en";
    }

    if (typeof module !== "undefined") {
        module.exports = { init, translate, setSrc, setDst, createRequest };
    }
    else {
        init();
        globalThis._init = init;
        globalThis._trans = translate;
    }
})();