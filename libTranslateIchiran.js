// sl=ja
// tl=en
(function () {
    var sourceLanguage, targetLanguage;
    var kuromoji, tokenizer, MDX, path, mdict;
    const veryEasyWords = ["する", "ある", "いる", "です", "なる", "ない", "おる", "くる", "行く", "来る", "あげる", "もらう", "やる", "できる", "見る", 
        "言う", "それ", "これ", "あれ", "私", "あなた", "人", "もの", "こと", "時", "所", "中", "前", "後", "誰", "何", "どこ", "どう", "いつ", "の", 
        "ん", "なに", "いい", "よい", "大きい", "小さい", "新しい", "古い", "長い", "短い", "高い", "低い", "多い", "少ない", "良い", "悪い", 
        "俺", "おれ", "僕", "ぼく", "あたし", "わたし", "あんた", "あなたたち", "みんな", "皆", "全部", "何か", "誰か", "どこか", "いつか", "為る", 
        "から", "こと", "もの", "よう", "ん", "な", "に", "が", "を", "と", "も", "で", "へ", "や", "ね", "よ", "ぞ", "ぜ", "さ", "なあ",
        "か", "だ", "です", "ます", "たい", "た", "て", "ない", "ん", "う", "よう", "らしい", "そう", "みたい", "っぽい", "だけ", "ほど", "くらい",
        "ぐらい", "など", "なんか", "なんて", "とか", "でも", "しか", "ばかり", "ずつ", "まで", "から", "より", "は", "そこ", "ここ", "あそこ", "どこ",
         "こちら", "そちら", "あちら", "どちら", "誰", "何", "いつ", "どう", "どうして", "なぜ", "なに", "なん",];

    function init(sl, tl) {
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

    function translate(str, sl, tl) {
        return createRequest(str, sl, tl);
    }

    function parseHtml(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // --- helper: clean a dt text: remove bracket readings and leading numbering, trim ---
        function cleanBaseText(s) {
            if (!s) return '';
            // remove fullwidth 【】 and any (...) and leading "1. "
            return s
            .replace(/【[^】]*】/g, '')       // remove Japanese bracketed reading
            .replace(/\([^)]*\)/g, '')       // remove parenthesized text if any
            .replace(/^\s*\d+\.\s*/, '')     // remove leading "1. " numbering like "1. ウソ"
            .replace(/[«»"'“”]/g, '')        // remove quotes
            .replace(/\s+/g, ' ')            // collapse spaces
            .trim();
        }

        // --- build fullText (kana segmentation) similar to previous version ---
        const kanaParts = Array.from(doc.querySelectorAll('span.ds-text[data-pick="0"]'))
            .map(el => ({ part: Number(el.getAttribute('data-part') || 0), el }));
        const punctParts = Array.from(doc.querySelectorAll('span.normal-text'))
            .map(el => ({ part: Number(el.getAttribute('data-part') || 0), el }));
        const allParts = kanaParts.concat(punctParts).sort((a, b) => a.part - b.part);

        const segText = (kanaEl) => {
            const toks = Array.from(kanaEl.querySelectorAll('span.ds-word'))
            .map(w => w.textContent.trim()).filter(Boolean);
            return toks.join('　'); // 全角空格，和 ichi.moe 保持一致
        };

        let fullText = '';
        for (let i = 0; i < allParts.length; i++) {
            const p = allParts[i];
            if (p.el.classList.contains('ds-text')) {
            if (i > 0 && allParts[i - 1].el.classList.contains('normal-text')) fullText += ' ';
            fullText += segText(p.el);
            } else {
            fullText += p.el.textContent.trim();
            }
        }

        // --- main: returnedWords: one entry per ds-word in order, prefer conjugation-base if exists ---
        const returnedWords = [];
        // iterate ds-text (selected pick) in part order
        const dsTexts = Array.from(doc.querySelectorAll('span.ds-text[data-pick="0"]'))
            .sort((a, b) => Number(a.getAttribute('data-part')) - Number(b.getAttribute('data-part')));

        for (const dsText of dsTexts) {
            const part = dsText.getAttribute('data-part');
            const dsWords = Array.from(dsText.querySelectorAll('span.ds-word'));
            // find the matching gloss-row for this part (selected pick)
            const glossRow = doc.querySelector(`div.row.gloss-row[data-part="${part}"][data-pick="0"]`);
            for (const dsWord of dsWords) {
                const wordIdx = dsWord.getAttribute('data-word'); // index inside this part
                let out = null;

                if (glossRow) {
                    // find the gloss element for this token
                    const glossEl = glossRow.querySelector(`.gloss[data-word="${wordIdx}"]`);
                    if (glossEl) {
                    // 1) try conjugation base (conj-gloss dl dt)
                        const conjDt = glossEl.querySelector('.conj-gloss dl dt');
                        if (conjDt && conjDt.textContent && conjDt.textContent.trim()) {
                            out = cleanBaseText(conjDt.textContent);
                        } else {
                            // 2) fallback to alternatives dt (top-level)
                            const altDt = glossEl.querySelector('dl.alternatives > dt');
                            if (altDt && altDt.textContent && altDt.textContent.trim()) {
                            out = cleanBaseText(altDt.textContent);
                            } else {
                            // 3) fallback to the visible link text (surface)
                            const a = glossEl.querySelector('.gloss-rtext a.info-link');
                            if (a && a.textContent) out = cleanBaseText(a.textContent);
                            }
                        }
                    }
                }

                // final fallback: the ds-word surface (kana/kanji as shown)
                if (!out) out = dsWord.textContent.trim();

                returnedWords.push(out);
            }
        }
        // console.log(returnedWords);
        // console.log(fullText);
        var resultString = "";
        returnedWords.forEach(function (word) {
            if (veryEasyWords.indexOf(word) !== -1) {
                return;
            }
            var def = lookupWithLink(word);
            if (def && def.definition) {
                const meanings = extractMeanings(def.definition);
                resultString += `${def.keyText}\n${meanings}\n\n`;
            }
        });
        resultString += "【仮名】：\n" + fullText + "\n\n";
        return resultString;
    }

    function createRequest(str, sl, tl) {
        const url = `https://ichi.moe/cl/qr/?q=${encodeURIComponent(str)}&r=kana`;
        return fetch(url).then(res => res.text())
            .then(html => {
                return parseHtml(html);
            }
        );  
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