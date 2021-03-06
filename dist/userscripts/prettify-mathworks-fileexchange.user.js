// ==UserScript==
// @name           MathWorks File Exchange: MATLAB syntax highlighter
// @description    Enable MATLAB syntax highlighting on File Exchange
// @namespace      https://github.com/amroamroamro
// @author         Amro (amroamroamro@gmail.com)
// @homepage       https://github.com/amroamroamro/prettify-matlab
// @license        MIT
// @version        2.0
// @icon           http://www.mathworks.com/favicon.ico
// @include        http://www.mathworks.com/matlabcentral/fileexchange/*
// @include        http://www.mathworks.com/matlabcentral/mlc-downloads/*/index.html
// @run-at         document-end
// @grant          none
// ==/UserScript==

(function () {
    // helper functions to inject <script> and <style> elements into page DOM
    // (as a way to executd in page scope, escaping the Greasemonkey sandbox)
    // REFERENCE : https://wiki.greasespot.net/Content_Script_Injection
    function GM_addScript_inline(jsFunc) {
        var script = document.createElement('script');
        script.setAttribute('type', 'text/javascript');
        script.textContent = '(' + jsFunc.toString() + ')();';
        document.body.appendChild(script);
        //document.body.removeChild(script);
    }
    function GM_addScript_external(jsURL) {
        var script = document.createElement('script');
        script.setAttribute('type', 'text/javascript');
        script.setAttribute('src', jsURL);
        document.getElementsByTagName('head')[0].appendChild(script);
    }
    function GM_addStyle_inline(cssTxt) {
        var style = document.createElement('style');
        style.setAttribute('type', 'text/css');
        style.textContent = cssTxt.toString();
        document.getElementsByTagName('head')[0].appendChild(style);
    }
    function GM_addStyle_external(cssURL) {
        var style = document.createElement('link');
        style.setAttribute('rel', 'stylesheet');
        style.setAttribute('type', 'text/css');
        style.setAttribute('href', cssURL);
        document.getElementsByTagName('head')[0].appendChild(style);
    }

    // userscript runs in one of two places:
    if (/^\/matlabcentral\/fileexchange\/\d+/.test(window.location.pathname)) {
        // 1) in parent page => relax iframe sandbox restrictions to allow JS
        var ifrm = document.getElementById('content_iframe');
        if (ifrm && ifrm.getAttribute('sandbox')) {
            //ifrm.sandbox += ' allow-scripts';
            ifrm.removeAttribute('sandbox');  // remove sandbox altogether
        }
        return;
    } else if (!/^\/matlabcentral\/mlc-downloads\//.test(window.location.pathname)) {
        // 2) in iframe page => apply syntax highlighting
        // activate only on source code page (ignore download and such)
        return;
    }

    // load prettify library
    GM_addStyle_external('http://cdn.rawgit.com/google/code-prettify/master/loader/prettify.css');
    GM_addScript_external('http://cdn.rawgit.com/google/code-prettify/master/loader/prettify.js');

    // insert CSS styles
    GM_addStyle_inline([
        '@media screen {',
        '.pln { color: #000; }     /* plaintext/whitespace */',
        '.str { color: #A020F0; }  /* strings */',
        '.kwd { color: #00F; }     /* reserved keywords */',
        '.com { color: #228B22; }  /* comments */',
        '.typ { color: #000; font-weight: bold; } /* data types */',
        '.lit { color: #800000; }  /* literal numeric values */',
        '.pun { color: #000; }     /* punctuation and operators */',
        '.opn, .clo { color: #DE7D00; }',
        '.tag { color: #00F; }',
        '.atn { color: #B20000; }',
        '.atv { color: #A020F0; }',
        '.dec { color: #00007C; }',
        '.var { color: #00008B; }  /* special variables/constants */',
        '.fun { color: #00A3A3; }  /* core/toolbox functions */',
        '.idnt { color: #000; }    /* user-defined variable/function identifiers */',
        '.scmd { color: #B28C00; } /* system commands */',
        '.prmpt { color: #000; }   /* command prompt */',
        '.err { color: #E60000; }  /* error messages */',
        '.wrn { color: #FF6400; }  /* warning messages */',
        '.prn { color: #000; }     /* parentheses, braces, brackets */',
        '.tps { color: #000; }     /* transpose operator */',
        '.lcnt { color: #00F; }    /* line continuation */',
        '}'
    ].join('\n'));
    GM_addStyle_inline([
        'pre.prettyprint {',
        '  white-space: pre;',
        '  overflow: auto;',
        '  padding: 9.5px;',
        '  border: 1px solid #CCC;',
        '  background-color: #F5F5F5;',
        '}'
    ].join('\n'));

    // insert JS code
    GM_addScript_inline(function () {
        // wait for prettify to load
        waitForPR();

        function waitForPR() {
            if (typeof PR === 'undefined') {
                window.setTimeout(waitForPR, 200);
            } else {
                // register the new language handlers
                registerMATLABLanguageHandlers();

                // for each <pre.matlab-code> block,
                // apply prettyprint class, and set language to MATLAB
                var blocks = document.getElementsByTagName('pre');
                for (var i = 0; i < blocks.length; ++i) {
                    if (blocks[i].className.indexOf('matlab-code') !== -1) {
                        blocks[i].className = 'prettyprint lang-matlab';
                    }
                }

                // apply highlighting
                PR.prettyPrint();
            }
        }

        function registerMATLABLanguageHandlers() {
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
                PR_FUNCTION = 'fun pln',           // core/toolbox functions
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

                // commonly used builtin functions from core MATLAB and a few popular toolboxes
                // List of functions extracted from MATLAB R2016a, refer to:
                //  http://www.mathworks.com/help/matlab/functionlist-alpha.html
                //  http://www.mathworks.com/help/stats/functionlist-alpha.html
                //  http://www.mathworks.com/help/images/functionlist-alpha.html
                //  http://www.mathworks.com/help/optim/functionlist-alpha.html
                [PR_FUNCTION, new RegExp('^\\b(?:abs|accumarray|acos(?:d|h)?|acot(?:d|h)?|acsc(?:d|h)?|actxcontrol(?:list|select)?|actxGetRunningServer|actxserver|addlistener|addpath|addpref|addtodate|airy|align|alim|all|allchild|alpha|alphamap|alphaShape|amd|ancestor|and|angle|animatedline|annotation|any|appdesigner|area|array2table|arrayfun|asec(?:d|h)?|asin(?:d|h)?|assert|assignin|atan(?:2|2d|d|h)?|audiodevinfo|audioinfo|audioplayer|audioread|audiorecorder|aufinfo|auread|autumn|audiowrite|auwrite|avifile|aviinfo|aviread|axes|axis|balance|bandwidth|bar(?:3|3h|h)?|base2dec|beep|BeginInvoke|bench|bessel(?:h|i|j|k|y)|beta|betainc|betaincinv|betaln|bicg|bicgstabl?|bin2dec|bitand|bitcmp|bitget|bitmax|bitnot|bitor|bitset|bitshift|bitxor|blanks|blkdiag|bone|boundary|box|brighten|brush|bsxfun|builddocsearchdb|builtin|bvp4c|bvp5c|bvpget|bvpinit|bvpset|bvpxtend|caldays|calendar|calendarDuration|calllib|callSoapService|calmonths|calquarters|calweeks|calyears|camdolly|cameratoolbar|camlight|camlookat|camorbit|campan|campos|camproj|camroll|camtarget|camup|camva|camzoom|cart2pol|cart2sph|cast|cat|categorical|caxis|cd|cdf2rdf|cdfepoch|cdfinfo|cdflib|cdfread|cdfwrite|ceil|cell2mat|cell2struct|cell2table|celldisp|cellfun|cellplot|cellstr|cgs|checkcode|checkin|checkout|chol|cholinc|cholupdate|circshift|cla|clabel|class|clc|clear|clearvars|clf|clipboard|clock|close|closereq|cmopts|cmpermute|cmunique|colamd|colon|colorbar|colordef|colormap|colormapeditor|colperm|Combine|comet3?|commandhistory|commandwindow|compan|compass|complex|computer|cond|condeig|condest|coneplot|conj|containers\.Map|contour(?:3|c|f|slice)?|contrast|conv2?|convhulln?|convn|cool|copper|copyfile|copyobj|corrcoef|cos(?:d|h)?|cot(?:d|h)?|cov|cplxpair|cputime|createClassFromWsdl|createSoapMessage|cross|csc(?:d|h)?|csvread|csvwrite|ctranspose|cum(?:max|min|prod|sum|trapz)|curl|customverctrl|cylinder|daqread|daspect|datacursormode|datastore|datatipinfo|date|datenum|datestr|datetick|datetime|datevec|days|dbclear|dbcont|dbdown|dblquad|dbmex|dbquit|dbstack|dbstatus|dbstep|dbstop|dbtype|dbup|dde23|ddeget|ddensd|ddesd|ddeset|deal|deblank|dec2base|dec2bin|dec2hex|decic|deconv|deg2rad|del2|delaunay(?:3|n)?|DelaunayTri|delaunayTriangulation|delete|demo|depdir|depfun|det|details|detrend|deval|diag|dialog|diary|diff|diffuse|digraph|dir|discretize|disp|display|dither|divergence|dlmread|dlmwrite|dmperm|doc|docsearch|dos|dot|dragrect|drawnow|dsearch|dsearchn|duration|dynamicprops|echo|echodemo|edit|eigs?|ellipj|ellipke|ellipsoid|empty|enableNETfromNetworkDrive|enableservice|EndInvoke|enumeration|eomday|eq|erf(?:c|cinv|cx|inf|inv)?|error|errorbar|errordlg|etime|etree|etreeplot|evalc?|evalin|event\.(?:DynamicPropertyEvent|EventData|hasListener|listener|PropertyEvent|proplistener)|eventlisteners|events|exifread|exist|exit|exp|expint|expm1?|export2wsdlg|exportsetupdlg|eye|ezcontourf?|ezmeshc?|ezplot3?|ezpolar|ezsurfc?|factor|factorial|fclose|fcontour|feather|feature|feof|ferror|feval|fft(?:2|n|shift|w)?|fgetl|fgets|fieldnames|figure|figurepalette|fileattrib|filebrowser|fileDatastore|filemarker|fileparts|fileread|filesep|fill3?|filter2?|find|findall|findfigs|findgroups|findobj|findstr|finish|fitsdisp|fitsinfo|fitsread|fitswrite|fix|flag|flintmax|flip|flipdim|fliplr|flipud|floor|flow|fmesh|fminbnd|fminsearch|fopen|format|fplot3?|fprintf|frame2im|fread|freqspace|frewind|fscanf|fseek|fsurf|ftell|ftp|full|fullfile|func2str|functions|functiontests|funm|fwrite|fzero|gallery|gamma(?:inc|incinv|ln)?|gc(?:a|bf|bo|d|f|mr|o)|ge|genpath|genvarname|get|getappdata|getenv|getfield|getframe|getpixelposition|getpref|ginput|gmres|gobjects|gplot|grabcode|gradient|graph|gray|graymon|grid|griddata(?:3|n)?|griddedInterpolant|groot|gsvd|gt|gtext|guidata|guide|guihandles|gunzip|gzip|H5(?:|A|DS?|E|F|G|I|L|ML|O|P|R|S|T|Z)?|h5(?:create|disp|info|read|readatt|write|writeatt)|hadamard|handle|addlistener|notify|hankel|hdf5?|hdf5(?:info|read|write)|hdfan|hdfdf24|hdfdfr8|hdfh(?:d|e|x)?|hdfinfo|hdfml|hdfpt|hdfread|hdftool|hdfv(?:f|h|s)?|help|helpbrowser|helpdesk|helpdlg|helpwin|hess|hex2dec|hex2num|hgexport|hggroup|hgload|hgsave|hgsetget|hgtransform|hidden|hilb|histc?|histcounts2?|histogram2?|hold|home|horzcat|hostid|hot|hsv|hours|hsv2rgb|hypot|ichol|idivide|ifft(?:2|n|shift)?|ilu|im2double|im2frame|im2java|imag|image|imageDatastore|imagesc|imapprox|imfinfo|imformats|import|importdata|imread|imshow|imwrite|ind2rgb|ind2sub|inferiorto|info|inline|inmem|inpolygon|input|inputdlg|inputname|inputParser|inspect|instrcallback|instrfind|instrfindall|int2str|integral(?:2|3)?|interp(?:1|1q|2|3|ft|n)|interpstreamspeed|intersect|intmax|intmin|inv|invhilb|ipermute|isa|isappdata|isbanded|iscalendarduration|iscategorical|iscell|iscellstr|ischar|iscolumn|iscom|isdatetime|isdiag|isdir|isduration|isempty|isenum|isequal|isequaln|isequalwithequalnans|isevent|isfield|isfinite|isfloat|isglobal|isgraphics|ishandle|ishermitian|ishghandle|ishold|isinf|isinteger|isinterface|isjava|iskeyword|isletter|islogical|ismac|ismatrix|ismember|ismembertol|ismethod|isnan|isnumeric|isobject|isocaps|isocolors|isonormals|isosurface|ispc|ispref|isprime|isprop|isreal|isrow|isscalar|issorted|isspace|issparse|isstr|isstrprop|isstruct|isstudent|issymmetric|istable|istril|istriu|isunix|isvalid|isvarname|isvector|javaaddpath|javaArray|javachk|javaclasspath|javacomponent|javaMethod|javaMethodEDT|javaObject|javaObjectEDT|javarmpath|jet|keyboard|kron|lasterr|lasterror|lastwarn|lcm|ldivide|ldl|le|legend|legendre|length|lib\.pointer|libfunctions|libfunctionsview|libisloaded|libpointer|libstruct|license|light|lightangle|lighting|lin2mu|line|lines|linkaxes|linkdata|linkprop|linsolve|linspace|listdlg|listfonts|load|loadlibrary|loadobj|localfunctions|log(?:|10|1p|2|m)?|loglog|logspace|lookfor|lower|ls|lscov|lsqnonneg|lsqr|lt|lu|luinc|magic|makehgtform|mapreducer?|mat2cell|mat2str|material|matfile|matlab\.addons\.toolbox\.(?:installedToolboxes|installToolbox|packageToolbox|toolboxVersion|uninstallToolbox)|matlab\.apputil\.(?:create|getInstalledAppInfo|install|package|run|uninstall)|matlab\.codetools\.requiredFilesAndProducts|matlab\.exception\.(?:JavaException|PyException)|matlab\.io\.(?:hdf4\.sd|hdfeos\.(?:gd|sw)|MatFile|saveVariablesToScript)|matlab\.lang\.(?:makeUniqueStrings|makeValidName)|matlab\.mixin\.(?:Copyable|CustomDisplay|Heterogeneous|SetGet|util\.PropertyGroup)|matlab\.perftest\.(?:FixedTimeExperiment|FrequentistTimeExperiment|TestCase|TimeExperiment)|matlab\.unittest\.constraints\.(?:BooleanConstraint|Constraint|Tolerance)|matlab\.unittest\.diagnostics\.(?:ConstraintDiagnostic|Diagnostic)|matlab\.unittest\.fixtures\.Fixture|matlab\.unittest\.measurement\.MeasurementResult|matlab\.unittest\.plugins\.(?:OutputStream|QualifyingPlugin|TestRunnerPlugin)|matlab\.unittest\.(?:FunctionTestCase|Test|TestCase|TestResult|TestRunner|TestSuite)|matlab\.wsdl\.(?:createWSDLClient|setWSDLToolPath)|matlabshared\.supportpkg\.(?:checkForUpdate|getInstalled|getSupportPackageRoot|setSupportPackageRoot)|matlabrc|matlabroot|max|maxNumCompThreads|mean|median|membrane|memmapfile|memory|menu|mesh(?:c|z)?|meshgrid|meta\.(?:abstractDetails|class(?:\.fromName)?|DynamicProperty|EnumeratedValue|event|MetaData|method|package(?:\.fromName|\.getAllPackages)?|property)|metaclass|methods|methodsview|mex(?:\.getCompilerConfigurations)?|MException|mexext|mfilename|milliseconds|min|minres|minus|minutes|mislocked|mkdir|mkpp|mldivide|mlint|mlintrpt|mlock|mmfileinfo|mmreader|mod|mode|more|move|movefile|movegui|movie|movie2avi|mov(?:max|mean|median|min|std|sum|var)|mpower|mrdivide|msgbox|mtimes|mu2lin|multibandread|multibandwrite|munlock|namelengthmax|nargchk|narginchk|nargoutchk|NaT|native2unicode|nccreate|ncdisp|nchoosek|ncinfo|nc(?:read|readatt|write|writeatt|writeschema)|ndgrid|ndims|ne|NET\.(?:addAssembly|Assembly|convertArray|createArray|createGeneric|disableAutoRelease|enableAutoRelease|GenericClass|invokeGenericMethod|isNETSupported|NetException|setStaticProperty)|netcdf|newplot|nextpow2|nnz|noanimate|nonzeros|norm|normest|not|notebook|now|nthroot|null|num2cell|num2hex|num2str|numArgumentsFromSubscript|numel|nzmax|ode(?:113|15i|15s|23|23s|23t|23tb|45)|odeget|odeset|odextend|onCleanup|ones|open|openfig|opengl|openvar|optimget|optimset|or|ordeig|orderfields|ordqz|ordschur|orient|orth|pack|padecoef|pagesetupdlg|pan|pareto|parseSoapResponse|pascal|patch|path|path2rc|pathsep|pathtool|pause|pbaspect|pcg|pchip|pcode|pcolor|pdepe|pdeval|peaks|perl|perms|permute|pie3?|pink|pinv|planerot|playshow|plot3?|plotbrowser|plotedit|plotmatrix|plottools|plotyy|plus|pol2cart|polar|polaraxes|polarplot|poly(?:der|eig|fit|int|val|valm)?|polyarea|pow2|power|ppval|prefdir|preferences|primes|print|printdlg|printopt|printpreview|prod|profile|profsave|propedit|properties|propertyeditor|psi|publish|pwd|qhull|pyargs|pyversion|qmr|qr|qrdelete|qrinsert|qrupdate|quad(?:2d|gk|l|v)?|questdlg|quit|quiver3?|qz|rad2deg|rand(?:i|n|perm)?|RandStream(?:\.create|\.getGlobalStream|\.list|\.setGlobalStream)?|rank|rats?|rbbox|rcond|rdivide|readasync|readtable|real(?:log|max|min|pow|sqrt)?|rectangle|rectint|recycle|reducepatch|reducevolume|refresh|refreshdata|regexp(?:i|rep|translate)?|regmatlabserver|rehash|rem|repelem|repmat|reset|reshape|residue|restoredefaultpath|rethrow|rgb2gray|rgb2hsv|rgb2ind|rgbplot|ribbon|rlim|rmappdata|rmdir|rmfield|rmpath|rmpref|rng|roots|rose|rosser|rot90|rotate|rotate3d|round|rref|rsf2csf|run|runperf|runtests|save|saveas|savefig|saveobj|savepath|scatter3?|scatteredInterpolant|schur|sec(?:d|h)?|seconds|selectmoveresize|semilog(?:x|y)|sendmail|serial|set|setappdata|setdiff|setenv|setfield|setpixelposition|setpref|setstr|setxor|shading|shg|shiftdim|showplottool|shrinkfaces|sign|sin(?:d|h)?|size|slice|smooth3|snapnow|sort|sortrows|sound|soundsc|sp(?:alloc|augment|convert|diags|eye|fun|ones|parms|randn?|randsym|rank)|specular|sph2cart|sphere|spinmap|spline|splitapply|spring|spreadsheetDatastore|sprintf|spy|sqrtm?|squeeze|ss2tf|sscanf|stairs|startup|std|stem3?|stopasync|str2double|str2func|str2mat|str2num|strcat|strcmpi?|stream2|stream3|streamline|streamparticles|streamribbon|streamslice|streamtube|strfind|strjoin|strjust|strmatch|strncmpi?|strread|strrep|strsplit|strtok|strtrim|struct2cell|struct2table|structfun|strvcat|sub2ind|subplot|subsasgn|subsindex|subspace|subsref|substruct|subvolume|sum|summer|superclasses|superiorto|support|supportPackageInstaller|surf(?:c|l)?|surf2patch|surface|surfnorm|svds?|swapbytes|sylvester|symamd|symbfact|symmlq|symrcm|symvar|system|table|table2array|table2cell|table2struct|tabularTextDatastore|tan(?:d|h)?|tar|targetupdater|tcpclient|tempdir|tempname|testsuite|tetramesh|texlabel|text|textread|textscan|textwrap|tfqmr|thetalim|throw|tic|Tiff|timeit|timer|timerfind|timerfindall|times|timeseries|timezones|title|toc|todatenum|toeplitz|toolboxdir|trace|transpose|trapz|treelayout|treeplot|triangulation|tril|trimesh|triplequad|triplot|TriRep|TriScatteredInterp|trisurf|triu|tscollection|tsearch|tsdata\.event|tsearchn|tstool|type|typecast|uialert|uiaxes|uibutton|uibuttongroup|uicheckbox|uicontextmenu|uicontrol|uidropdown|uieditfield|uifigure|uigauge|uigetdir|uigetfile|uigetpref|uiimport|uiknob|uilabel|uilamp|uilistbox|uimenu|uiopen|uipanel|uipushtool|uiputfile|uiradiobutton|uiresume|uisave|uisetcolor|uisetfont|uisetpref|uislider|uispinner|uistack|uiswitch|uitab|uitabgroup|uitable|uitextarea|uitogglebutton|uitoggletool|uitoolbar|uiwait|uminus|undocheckout|unicode2native|union|unique|uniquetol|unix|unloadlibrary|unmesh|unmkpp|untar|unwrap|unzip|uplus|upper|urlread|urlwrite|usejava|userpath|validateattributes|validatestring|vander|var|vectorize|ver|verctrl|verLessThan|version|vertcat|VideoReader|VideoWriter|view|viewmtx|visdiff|volumebounds|voronoi|voronoin|wait|waitbar|waitfor|waitforbuttonpress|warndlg|warning|waterfall|wavfinfo|wavplay|wavread|wavrecord|wavwrite|web|weboptions|webread|websave|webwrite|weekday|what|whatsnew|which|whitebg|who|whos|wilkinson|winopen|winqueryreg|winter|wk1finfo|wk1read|wk1write|workspace|writetable|xlabel|xlim|xls(?:finfo|read|write)|xmlread|xmlwrite|xor|xslt|years|ylabel|ylim|yyaxis|zeros|zip|zlabel|zlim|zoom)\\b'), null],
                [PR_FUNCTION, new RegExp('^\\b(?:addedvarplot|addlevels|adtest|andrewsplot|anova(?:1|2|n)|ansaribradley|aoctool|barttest|bbdesign|beta(?:cdf|fit|inv|like|pdf|rnd|stat)|bino(?:cdf|fit|inv|pdf|rnd|stat)|biplot|bootci|bootstrp|boxplot|candexch|candgen|canoncorr|capability|capaplot|caseread|casewrite|ccdesign|cdf|cdfplot|cell2dataset|chi2(?:cdf|gof|inv|pdf|rnd|stat)|cholcov|classify|classregtree|cluster|clusterdata|cmdscale|combnk|confusionmat|controlchart|controlrules|cophenet|copula(?:cdf|fit|param|pdf|rnd|stat)|cordexch|corr|corrcov|coxphfit|createns|crosstab|crossval|cvpartition|datasample|dataset|dataset2table|daugment|dcovary|dendrogram|designecoc|dfittool|disttool|droplevels|dummyvar|dwtest|ecdf|ecdfhist|evalclusters|ev(?:cdf|fit|inv|like|pdf|rnd|stat)|exp(?:cdf|fit|inv|like|pdf|rnd|stat)|factoran|fcdf|ff2n|finv|fishertest|fitSVMPosterior|fit(?:dist|cdiscr|cecoc|cknn|clinear|cnb|csvm|ctree|ensemble|glm|glme|gmdist|lm|lme|lmematrix|nlm|rgp|rlinear|rm|rsvm|rtree)|fpdf|fracfact|fracfactgen|friedman|frnd|fstat|fsurfht|fullfact|gagerr|gam(?:cdf|fit|inv|like|pdf|rnd|stat)|geo(?:cdf|inv|mean|pdf|rnd|stat)|gev(?:cdf|fit|inv|like|pdf|rnd|stat)|gline|glmfit|glmval|glyphplot|gmdistribution(?:\.fit)?|gname|gp(?:cdf|fit|inv|like|pdf|rnd|stat)|gplotmatrix|grp2idx|grpstats|gscatter|haltonset|harmmean|hist3|histfit|hmm(?:decode|estimate|generate|train|viterbi)|hougen|hyge(?:cdf|inv|pdf|rnd|stat)|icdf|inconsistent|interactionplot|invpred|iqr|iwishrnd|jackknife|jbtest|johnsrnd|kmeans|kmedoids|knnsearch|kruskalwallis|ksdensity|kstest2?|kurtosis|lasso|lassoPlot|lassoglm|leverage|lhsdesign|lhsnorm|lillietest|linhyptest|linkage|logn(?:cdf|fit|inv|like|pdf|rnd|stat)|lsline|mad|mahal|maineffectsplot|makedist|manova1|manovacluster|mat2dataset|mdscale|mhsample|mle|mlecov|mnpdf|mnrnd|mnrfit|mnrval|moment|multcompare|multivarichart|mvksdensity|mvn(?:cdf|pdf|rnd)|mvregress|mvregresslike|mvt(?:cdf|pdf|rnd)|nan(?:cov|max|mean|median|min|std|sum|var)|nbin(?:cdf|fit|inv|pdf|rnd|stat)|ncf(?:cdf|inv|pdf|rnd|stat)|nct(?:cdf|inv|pdf|rnd|stat)|ncx2(?:cdf|inv|pdf|rnd|stat)|negloglik|nlinfit|nlintool|nlmefit|nlmefitsa|nlparci|nlpredci|nnmf|nominal|norm(?:cdf|fit|inv|like|pdf|rnd|stat)|normplot|normspec|optimalleaforder|ordinal|parallelcoords|paramci|paretotails|partialcorri?|pca|pcacov|pcares|pdf|pdist2?|pearsrnd|perfcurve|plsregress|poiss(?:cdf|fit|inv|pdf|rnd|tat)|polyconf|polytool|ppca|prctile|princomp|probplot|procrustes|proflik|qqplot|qrandset|qrandstream|quantile|randg|random|randsample|randtool|range|rangesearch|ranksum|rayl(?:cdf|fit|inv|pdf|rnd|stat)|rcoplot|refcurve|refline|regress|regstats|relieff|ridge|robustcov|robustdemo|robustfit|rotatefactors|rowexch|rsmdemo|rstool|runstest|sampsizepwr|scatterhist|sequentialfs|signrank|signtest|silhouette|skewness|slicesample|sobolset|squareform|statget|statset|stepwise|stepwise(?:fit|glm|lm)|struct2dataset|surfht|svmclassify|svmtrain|table2dataset|tabulate|tblread|tblwrite|tcdf|tdfread|template(?:Discriminant|ECOC|Ensemble|KNN|Linear|NaiveBayes|SVM|Tree)|testcholdout|testckfold|tiedrank|tinv|tpdf|tree(?:disp|fit|prune|test|val)|trimmean|trnd|truncate|tstat|ttest2?|unid(?:cdf|inv|pdf|rnd|stat)|unif(?:cdf|inv|it|pdf|rnd|stat)|vartest(?:2|n)?|wbl(?:cdf|fit|inv|like|pdf|rnd|stat)|wblplot|wishrnd|x2fx|xptread|zscore|ztest|clustering\.evaluation\.(?:CalinskiHarabasz|DaviesBouldin|Gap|Silhouette)Evaluation|prob\.(?:Beta|Binomial|BirnbaumSaunders|Burr|Exponential|ExtremeValue|Gamma|GeneralizedExtremeValue|GeneralizedPareto|HalfNormal|InverseGaussian|Kernel|Logistic|Loglogistic|Lognormal|Multinomial|Nakagami|NegativeBinomial|Normal|PiecewiseLinear|Poisson|Rayleigh|Rician|Stable|Triangular|Uniform|Weibull|tLocationScale)Distribution|Classification(?:Discriminant|ECOC|KNN|Linear|NaiveBayes|SVM|Tree)|CompactTreeBagger|ExhaustiveSearcher|GeneralizedLinearMixedModel|GeneralizedLinearModel(?:\.fit|\.stepwise)?|KDTreeSearcher|LinearMixedModel(?:\.fit|\.fitmatrix)?|LinearModel(?:\.fit|\.stepwise)?|NaiveBayes(?:\.fit)?|NonLinearModel(?:\.fit)?|ProbDistUnivKernel|ProbDistUnivParam|Regression(?:GP|Linear|SVM|Tree)|RepeatedMeasuresModel|TreeBagger)\\b'), null],
                [PR_FUNCTION, new RegExp('^\\b(?:activecontour|adapthisteq|adaptthresh|affine(?:2|3)d|analyze75info|analyze75read|applycform|applylut|axes2pix|bestblk|blockproc|boundarymask|bwarea|bwareafilt|bwareaopen|bwboundaries|bwconncomp|bwconvhull|bwdist|bwdistgeodesic|bweuler|bwhitmiss|bwlabeln?|bwlookup|bwmorph|bwpack|bwperim|bwpropfilt|bwselect|bwtraceboundary|bwulterode|bwunpack|checkerboard|col2im|colfilt|colorThresholder|conndef|convmtx2|corner|cornermetric|corr2|cp2tform|cpcorr|cpselect|cpstruct2pairs|dct2|dctmtx|deconvblind|deconvlucy|deconvreg|deconvwnr|decorrstretch|demosaic|dicom(?:anon|dict|disp|info|lookup|read|uid|write)|dpxinfo|dpxread|edge|edgetaper|entropy|entropyfilt|fan2para|fanbeam|findbounds|fitgeotrans|fliptform|freqz2|fsamp2|fspecial|ftrans2|fwind1|fwind2|gabor|getheight|getimage|getimagemodel|getline|getneighbors|getnhood|getpts|getrangefromclass|getrect|getsequence|gradientweight|gray2ind|graycomatrix|grayconnected|graycoprops|graydiffweight|graydist|grayslice|graythresh|hdrread|hdrwrite|histeq|hough|houghlines|houghpeaks|iccfind|iccread|iccroot|iccwrite|idct2|ifanbeam|im2bw|im2col|im2double|im2int16|im2java2d|im2single|im2uint16|im2uint8|imabsdiff|imadd|imadjust|ImageAdapter|imageBatchProcessor|imageinfo|imagemodel|imageRegionAnalyzer|images\.geotrans\.(?:LocalWeightedMean|PiecewiseLinear|Polynomial)Transformation2D|imageSegmenter|imapplymatrix|imapprox|imattributes|imbinarize|imbothat|imboxfilt3?|imclearborder|imclose|imcolormaptool|imcomplement|imcontour|imcontrast|imcrop|imdilate|imdisplayrange|imdistline|imdivide|imellipse|imerode|imextendedmax|imextendedmin|imfill|imfilter|imfindcircles|imfreehand|imfuse|imgaborfilt|imgaussfilt3?|imgca|imgcf|imgetfile|imgradient3?|imgradientxyz?|imguidedfilter|imhandles|imhist|imhistmatch|imhmax|imhmin|imimposemin|imlincomb|imline|immagbox|immovie|immse|immultiply|imnoise|imopen|imoverlay|imoverview|imoverviewpanel|impixel|impixelinfo|impixelinfoval|impixelregion|impixelregionpanel|implay|impoint|impoly|impositionrect|improfile|imputfile|impyramid|imquantize|imreconstruct|imrect|imref(?:2|3)d|imregconfig|imregcorr|imregdemons|imregionalmax|imregionalmin|imregister|imregtform|imresize|imroi|imrotate|imsave|imscrollpanel|imsegfmm|imseggeodesic|imsharpen|imshow|imshowpair|imsubtract|imtool|imtophat|imtransform|imtranslate|imview|imwarp|ind2gray|ind2rgb|integralBoxFilter3?|integralImage3?|interfileinfo|interfileread|intlut|ippl|iptaddcallback|iptcheckconn|iptcheckhandle|iptcheckinput|iptcheckmap|iptchecknargin|iptcheckstrs|iptdemos|iptgetapi|iptGetPointerBehavior|iptgetpref|ipticondir|iptnum2ordinal|iptPointerManager|iptprefs|iptremovecallback|iptSetPointerBehavior|iptsetpref|iptwindowalign|iradon|isbw|isflat|isgray|isicc|isind|isnitf|isrgb|isrset|lab2double|lab2rgb|lab2uint16|lab2uint8|lab2xyz|label2idx|label2rgb|labelmatrix|makecform|makeConstrainToRectFcn|makehdr|makelut|makeresampler|maketform|mat2gray|mean2|medfilt2|montage|multithresh|nitfinfo|nitfread|nlfilter|normxcorr2|ntsc2rgb|offsetstrel|openrset|ordfilt2|otf2psf|otsuthresh|padarray|para2fan|phantom|poly2mask|projective2d|psf2otf|psnr|qtdecomp|qtgetblk|qtsetblk|radon|rangefilt|reflect|regionfill|regionprops|registration\.metric\.(?:MattesMutualInformation|MeanSquares)|registration\.optimizer\.(?:OnePlusOneEvolutionary|RegularStepGradientDescent)|rgb2gray|rgb2hsv|rgb2lab|rgb2ntsc|rgb2xyz|rgb2ycbcr|roicolor|roifill|roifilt2|roipoly|rsetwrite|ssim|std2|stdfilt|strel|stretchlim|subimage|superpixels|tformarray|tformfwd|tforminv|tonemap|translate|truesize|uintlut|visboundaries|viscircles|warp|watershed|whitepoint|wiener2|xyz2double|xyz2lab|xyz2rgb|xyz2uint16|ycbcr2rgb)\\b'), null],
                [PR_FUNCTION, new RegExp('^\\b(?:bintprog|color|fgoalattain|fminbnd|fmincon|fminimax|fminsearch|fminunc|fseminf|fsolve|fzero|fzmult|gangstr|ktrlink|intlinprog|linprog|lsqcurvefit|lsqlin|lsqnonlin|lsqnonneg|mpsread|optimget|optimoptions|optimset|optimtool|quadprog|resetoptions)\\b'), null],

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
        }
    });
})();
