/**
 * @file Registers a language handler for MATLAB.
 * @author Amro
 * @see https://github.com/amroamroamro/prettify-matlab
 * @version 2.0.0
 * @copyright (c) 2013 by Amro (amroamroamro@gmail.com)
 * @license MIT
 */
(function () {
    // token names (correspond to CSS classes). We fallback to regular tokens
    // for stylesheets that don't style the custom tokens.
    /*
    PR.PR_PLAIN = 'pln';        // whitespace
    PR.PR_STRING = 'str';       // strings
    PR.PR_KEYWORD = 'kwd';      // reserved keywords
    PR.PR_COMMENT = 'com';      // comments
    PR.PR_TYPE = 'typ';         // data types
    PR.PR_LITERAL = 'lit';      // literal numeric values
    PR.PR_PUNCTUATION = 'pun';  // punctuation and operators
    PR.PR_TAG = 'tag';
    PR.PR_ATTRIB_NAME = 'atn';
    PR.PR_ATTRIB_VALUE = 'atv';
    PR.PR_DECLARATION = 'dec';
    */
    var PR_IDENTIFIER = 'idnt pln',        // user-defined variable/function identifiers
        PR_VARIABLE = 'var pln',           // special variables/constants
        PR_SYSCMD = 'scmd dec',            // system commands
        PR_PROMPT = 'prmpt pln',           // command prompt
        PR_ERROR = 'err pln',              // error messages
        PR_WARNING = 'wrn pln',            // warning messages
        PR_PARENS = 'prn pun',             // parentheses, braces, brackets
        PR_TRANSPOSE = 'tps pun',          // transpose operator
        PR_LINE_CONTINUATION = 'lcnt pun'; // line continuation

    // identifiers: variable/function name, or a chain of variable names joined
    // by dots (obj.method, struct.field1.field2, etc..). Valid variable names
    // (start with letter, and contains letters, digits, and underscores).
    // We match "xx.yy" as a whole so that if "xx" is plain and "yy" is not, we
    // dont get a false positive for "yy".
    //var reIdent = '(?:[a-zA-Z][a-zA-Z0-9_]*)';
    //var reIdentChain = '(?:' + reIdent + '(?:\.' + reIdent + ')*' + ')';

    // patterns that always start with a known character. Must have a shortcut string.
    var shortcutStylePatterns = [
        // whitespaces: space, tab, carriage return, line feed, line tab, form-feed, non-break space
        [PR.PR_PLAIN, /^[ \t\r\n\v\f\xA0]+/, null, ' \t\r\n\u000b\u000c\u00a0'],

        // block comments
        //TODO: chokes on nested block comments
        //TODO: false positives when the lines with %{ and %} contain non-spaces
        //[PR.PR_COMMENT, /^%(?:[^\{].*|\{(?:%|%*[^\}%])*(?:\}+%?)?)/, null],
        [PR.PR_COMMENT, /^%\{[^%]*%+(?:[^\}%][^%]*%+)*\}/, null],

        // single-line comments
        [PR.PR_COMMENT, /^%[^\r\n]*/, null, '%'],

        // system commands
        [PR_SYSCMD, /^![^\r\n]*/, null, '!']
    ];

    // patterns that will be tried in order if the shortcut ones fail. May have shortcuts.
    var fallthroughStylePatterns = [
        // line continuation
        //[PR_LINE_CONTINUATION, /^\.\.\.[^\r\n]*/, null],
        [PR_LINE_CONTINUATION, /^\.\.\.\s*[\r\n]/, null],

        // error message
        [PR_ERROR, /^\?\?\? [^\r\n]*/, null],

        // warning message
        [PR_WARNING, /^Warning: [^\r\n]*/, null],

        // command prompt/output
        [PR_PROMPT, /^>>\s+/, null],  // only the command prompt `>> `
        // full command output (both loose/compact format): `>> EXP\nVAR =\n VAL`
        //[PR_PROMPT, /^>>\s+[^\r\n]*[\r\n]{1,2}[^=]*=[^\r\n]*[\r\n]{1,2}[^\r\n]*/, null],

        // identifier (chain) or closing-parenthesis/brace/bracket,
        // and IS followed by transpose operator. This way we dont misdetect the
        // transpose operator ' as the start of a string
        ['lang-matlab-operators', /^((?:[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)*|\)|\]|\}|\.)')/, null],

        // identifier (chain), and NOT followed by transpose operator.
        // This must come AFTER the "is followed by transpose" step
        // (otherwise it chops the last char of identifier)
        ['lang-matlab-identifiers', /^([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)*)(?!')/, null],

        // single-quoted strings: allow for escaping with '', no multilines
        [PR.PR_STRING, /^'(?:[^']|'')*'/, null],
        // string vs. transpose (check before/after context using negative/positive lookbehind/lookahead)
        //[PR.PR_STRING, /(?:(?<=(?:\(|\[|\{|\s|=|;|,|:))|^)'(?:[^']|'')*'(?=(?:\)|\]|\}|\s|=|;|,|:|~|<|>|&|-|\+|\*|\.|\^|\|))/, null],

        // floating point numbers: 1, 1.0, 1i, -1.1E-1
        [PR.PR_LITERAL, /^[+\-]?\.?\d+(?:\.\d*)?(?:[Ee][+\-]?\d+)?[ij]?/, null],

        // parentheses, braces, brackets
        [PR_PARENS, /^(?:\{|\}|\(|\)|\[|\])/, null],  // '{}()[]'

        // other operators
        [PR.PR_PUNCTUATION, /^(?:<|>|=|~|@|&|;|,|:|!|\-|\+|\*|\^|\.|\||\\|\/)/, null]
    ];

    var identifiersPatterns = [
        // list of keywords (`iskeyword`)
        [PR.PR_KEYWORD, /^\b(?:break|case|catch|classdef|continue|else|elseif|end|for|function|global|if|otherwise|parfor|persistent|return|spmd|switch|try|while)\b/, null],

        // some specials variables/constants
        //TODO: i, j
        [PR_VARIABLE, /^\b(?:true|false|inf|Inf|nan|NaN|eps|pi|ans|nargin|nargout|varargin|varargout)\b/, null],

        // some data types
        [PR.PR_TYPE, /^\b(?:cell|struct|char|double|single|logical|u?int(?:8|16|32|64)|sparse)\b/, null],

        // plain identifier (user-defined variable/function name)
        [PR_IDENTIFIER, /^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)*/, null]
    ];

    var operatorsPatterns = [
        // forward to identifiers to match
        ['lang-matlab-identifiers', /^([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)*)/, null],

        // parentheses, braces, brackets
        [PR_PARENS, /^(?:\{|\}|\(|\)|\[|\])/, null],  // '{}()[]'

        // other operators
        [PR.PR_PUNCTUATION, /^(?:<|>|=|~|@|&|;|,|:|!|\-|\+|\*|\^|\.|\||\\|\/)/, null],

        // transpose operators
        [PR_TRANSPOSE, /^'/, null]
    ];

    PR.registerLangHandler(
        PR.createSimpleLexer([], identifiersPatterns),
        ['matlab-identifiers']
    );
    PR.registerLangHandler(
        PR.createSimpleLexer([], operatorsPatterns),
        ['matlab-operators']
    );
    PR.registerLangHandler(
        PR.createSimpleLexer(shortcutStylePatterns, fallthroughStylePatterns),
        ['matlab']
    );
})();
