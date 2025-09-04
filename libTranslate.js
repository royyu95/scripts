if (typeof module !== 'undefined') {
    module.exports = {
        Google: require('./libTranslateGoogle.js'),
        DeepL: require('./libTranslateDeepL.js'),
        Microsoft: require('./libTranslateMicrosoft.js'),
        VietPhrase: require('./libTranslateVietPhrase.js'),
        Ollama: require('./libTranslateOllama.js'),
        kuromoji: require('./libTranslateKuromoji.js')
    };
}
else {
    return ['Google', 'DeepL', 'Microsoft', 'VietPhrase', 'Ollama', 'kuromoji'];
}