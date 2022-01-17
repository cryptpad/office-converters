require.config({
    urlArgs: "v=" + +new Date(),
    paths: {
        "jquery": "lib/jquery.min",
    },
});
define([
    'jquery',
    'lib/nthen.js',
    'lib/hyperscript.js',
    'util.js',
    'lib/FileSaver.min.js',
], function ($, nThen, h, Util) {
    var x2tReady = Util.mkEvent(true);

    // Fetch required fonts and copy them into the X2T file system
    var fetchFonts = function (x2t, obj, cb) {
        if (!obj.fonts) { return void cb(); }
        var path = './fonts/';
        var fonts = obj.fonts;
        var files = obj.fonts_files;
        var suffixes = {
            indexR: '',
            indexB: '_Bold',
            indexBI: '_Bold_Italic',
            indexI: '_Italic',
        };
        nThen(function (waitFor) {
            fonts.forEach(function (font) {
                // Check if the font is already loaded
                if (!font.NeedStyles) { return; }
                // Pick the variants we need (regular, bold, italic)
                ['indexR', 'indexB', 'indexI', 'indexBI'].forEach(function (k) {
                    if (typeof(font[k]) !== "number" || font[k] === -1) { return; } // No matching file
                    var file = files[font[k]];

                    var name = font.Name + suffixes[k] + '.ttf';
                    Util.fetch(path + file.Id + ver, waitFor(function (err, buffer) {
                        if (buffer) {
                            x2t.FS.writeFile('/working/fonts/' + name, buffer);
                        }
                    }));
                });
            });
        }).nThen(function () {
            cb();
        });
    };

    // Initialize X2T
    var x2tInitialized = false;
    var x2tInit = function(x2t) {
        // x2t.FS.mount(x2t.MEMFS, {} , '/');
        x2t.FS.mkdir('/working');
        x2t.FS.mkdir('/working/media');
        x2t.FS.mkdir('/working/fonts');
        x2t.FS.mkdir('/working/themes');
        x2tInitialized = true;
        x2tReady.fire();
    };

    // Create and initialized an x2t object. Call back when it's ready.
    var getX2T = function (cb) {
        require(['x2t.js'], function() {
            var x2t = window.Module;
            x2t.run();
            if (x2tInitialized) {
                return void x2tReady.reg(function () {
                    cb(x2t);
                });
            }

            x2t.onRuntimeInitialized = function() {
                // Init x2t js module
                x2tInit(x2t);
                x2tReady.reg(function () {
                    cb(x2t);
                });
            };
        });
    };

    // Format IDs
    var getFormatId = function (ext) {
        // Sheets
        if (ext === 'xlsx') { return 257; }
        if (ext === 'xls') { return 258; }
        if (ext === 'ods') { return 259; }
        if (ext === 'csv') { return 260; }
        if (ext === 'pdf') { return 513; }
        // Docs
        if (ext === 'docx') { return 65; }
        if (ext === 'doc') { return 66; }
        if (ext === 'odt') { return 67; }
        if (ext === 'txt') { return 69; }
        if (ext === 'html') { return 70; }

        // Slides
        if (ext === 'pptx') { return 129; }
        if (ext === 'ppt') { return 130; }
        if (ext === 'odp') { return 131; }

        return;
    };
    var getFromId = function (ext) {
        var id = getFormatId(ext);
        if (!id) { return ''; }
        return '<m_nFormatFrom>'+id+'</m_nFormatFrom>';
    };
    var getToId = function (ext) {
        var id = getFormatId(ext);
        if (!id) { return ''; }
        return '<m_nFormatTo>'+id+'</m_nFormatTo>';
    };

    // Convert
    var x2tConvertDataInternal = function(x2t, obj) {
        var data = obj.data;
        var fileName = obj.fileName;
        var outputFormat = obj.outputFormat;
        var images = obj.images;

        // PDF
        var pdfData = '';
        if (outputFormat === "pdf" && typeof(data) === "object" && data.bin && data.buffer) {
            // Add conversion rules
            pdfData = "<m_bIsNoBase64>false</m_bIsNoBase64>" +
                      "<m_sFontDir>/working/fonts/</m_sFontDir>";
            // writing file to mounted working disk (in memory)
            x2t.FS.writeFile('/working/' + fileName, data.bin);
            x2t.FS.writeFile('/working/pdf.bin', data.buffer);
        } else {
            // writing file to mounted working disk (in memory)
            x2t.FS.writeFile('/working/' + fileName, data);
        }

        // Adding images
        Object.keys(images || {}).forEach(function (_mediaFileName) {
            if (/\.bin$/.test(_mediaFileName)) { return; }
            var mediasSources = obj.mediasSources || {};
            var mediasData = obj.mediasData || {};
            var mediaData = mediasData[_mediaFileName];
            var mediaFileName;
            if (mediaData) { // Theme image
                var path = _mediaFileName.split('/');
                mediaFileName = path.pop();
                var theme = path[path.indexOf('themes') + 1];
                try {
                    x2t.FS.mkdir('/working/themes/'+theme);
                    x2t.FS.mkdir('/working/themes/'+theme+'/media');
                } catch (e) {
                    console.warn(e);
                }
                x2t.FS.writeFile('/working/themes/'+theme+'/media/' + mediaFileName, new Uint8Array(mediaData.content));
                return;
            }
            // mediaData is undefined, check mediasSources
            mediaFileName = _mediaFileName.substring(6);
            var mediaSource = mediasSources[mediaFileName];
            mediaData = mediaSource ? mediasData[mediaSource.src] : undefined;
            if (mediaData) {
                var fileData = mediaData.content;
                x2t.FS.writeFile('/working/media/' + mediaFileName, new Uint8Array(fileData));
            } else {
                console.warn("Could not find media content for " + mediaFileName);
            }
        });


        var inputFormat = fileName.split('.').pop();

        var params =  "<?xml version=\"1.0\" encoding=\"utf-8\"?>"
                    + "<TaskQueueDataConvert xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\">"
                    + "<m_sFileFrom>/working/" + fileName + "</m_sFileFrom>"
                    + "<m_sThemeDir>/working/themes</m_sThemeDir>"
                    + "<m_sFileTo>/working/" + fileName + "." + outputFormat + "</m_sFileTo>"
                    + pdfData
                    + getFromId(inputFormat)
                    + getToId(outputFormat)
                    + "<m_bIsNoBase64>false</m_bIsNoBase64>"
                    + "</TaskQueueDataConvert>";


        // writing params file to mounted working disk (in memory)
        x2t.FS.writeFile('/working/params.xml', params);
        try {
            // running conversion
            x2t.ccall("runX2T", ["number"], ["string"], ["/working/params.xml"]);
        } catch (e) {
            console.error(e);
            return "";
        }

        // reading output file from working disk (in memory)
        var result;
        try {
            result = x2t.FS.readFile('/working/' + fileName + "." + outputFormat);
        } catch (e) {
            console.error("Failed reading converted file");
            return "";
        }
        return result;
    };

    var convert = function (obj, cb) {
        console.error(obj);
        getX2T(function (x2t) {
            // Fonts
            console.error(x2t);
            fetchFonts(x2t, obj, function () {
                console.error('fonts');
                var o = obj.outputFormat;

                if (o !== 'pdf') {
                    // Add intermediary conversion to Microsoft Office format if needed
                    // (bin to pdf is allowed)
                    [
                        // Import from Open Document
                        {source: '.ods', format: 'xlsx'},
                        {source: '.odt', format: 'docx'},
                        {source: '.odp', format: 'pptx'},
                        // Export to non Microsoft Office
                        {source: '.bin', type: 'sheet', format: 'xlsx'},
                        {source: '.bin', type: 'doc', format: 'docx'},
                        {source: '.bin', type: 'presentation', format: 'pptx'},
                    ].forEach(function (_step) {
                        if (obj.fileName.endsWith(_step.source) && obj.outputFormat !== _step.format &&
                            (!_step.type || _step.type === obj.type)) {
                            obj.outputFormat = _step.format;
                            obj.data = x2tConvertDataInternal(x2t, obj);
                            obj.fileName += '.'+_step.format;
                        }
                    });
                    obj.outputFormat = o;
                }

                var data = x2tConvertDataInternal(x2t, obj);

                // Convert to bin -- Import
                // We need to extract the images
                var images;
                if (o === 'bin') {
                    images = [];
                    var files = x2t.FS.readdir("/working/media/");
                    files.forEach(function (file) {
                        if (file !== "." && file !== "..") {
                            var fileData = x2t.FS.readFile("/working/media/" + file, {
                                encoding : "binary"
                            });
                            images.push({
                                name: file,
                                data: fileData
                            });
                        }
                    });

                }

                cb({
                    data: data,
                    images: images
                });
            });
        });
    };

    var convertData = function (data, name, typeTarget, cb) {
        convert({
            data: data,
            fileName: name,
            outputFormat: typeTarget,
        }, cb);
    };
    var x2tConverter = function (typeSrc, typeTarget, type) {
        return function (data, name, cb) {
            /*if (typeTarget === 'pdf') {
                // Converting to PDF? we need to load OO from a bin
                var next = function () {
                    var blob = new Blob([data], {type: "application/bin;charset=utf-8"});
                    loadOO(blob, type, name, function (blob) {
                        cb(blob);
                    });
                };
                if (typeSrc === 'bin') { return next(); }
                convertData(data, name, 'bin', function (err, obj) {
                    if (err || !obj || !obj.data) {
                        UI.warn(Messages.error);
                        return void cb();
                    }
                    name += '.bin';
                    data = obj.data;
                    APP.images = obj.images;
                    next();
                });
                return;
            }*/
            convertData(data, name, typeTarget, function (obj) {
                if (!obj || !obj.data) {
                    console.warn("Error", err);
                    return void cb();
                }
                cb(obj.data, obj.images);
            });
        };
    };

    var CONVERTERS = {
        xlsx: {
            //pdf: x2tConverter('xlsx', 'pdf', 'sheet'),
            ods: x2tConverter('xlsx', 'ods', 'sheet'),
            bin: x2tConverter('xlsx', 'bin', 'sheet'),
        },
        ods: {
            //pdf: x2tConverter('ods', 'pdf', 'sheet'),
            xlsx: x2tConverter('ods', 'xlsx', 'sheet'),
            bin: x2tConverter('ods', 'bin', 'sheet'),
        },
        odt: {
            docx: x2tConverter('odt', 'docx', 'doc'),
            txt: x2tConverter('odt', 'txt', 'doc'),
            bin: x2tConverter('odt', 'bin', 'doc'),
            //pdf: x2tConverter('odt', 'pdf', 'doc'),
        },
        docx: {
            odt: x2tConverter('docx', 'odt', 'doc'),
            txt: x2tConverter('docx', 'txt', 'doc'),
            bin: x2tConverter('docx', 'bin', 'doc'),
            //pdf: x2tConverter('docx', 'pdf', 'doc'),
        },
        txt: {
            odt: x2tConverter('txt', 'odt', 'doc'),
            docx: x2tConverter('txt', 'docx', 'doc'),
            bin: x2tConverter('txt', 'bin', 'doc'),
            //pdf: x2tConverter('txt', 'pdf', 'doc'),
        },
        odp: {
            pptx: x2tConverter('odp', 'pptx', 'slide'),
            bin: x2tConverter('odp', 'bin', 'slide'),
            //pdf: x2tConverter('odp', 'pdf', 'slide'),
        },
        pptx: {
            odp: x2tConverter('pptx', 'odp', 'slide'),
            bin: x2tConverter('pptx', 'bin', 'slide'),
            //pdf: x2tConverter('pptx', 'pdf', 'slide'),
        },
    };

    var Messages = {};
    Messages.convert_hint = "Pick the file to convert. The list of output formats will be visible afterwards.";
    Messages.convert_unsupported = "UNSUPPORTED FILE TYPE :("; // XXX

    // On load
    $(function () {
        var $form = $('body');
        var title = h('h1', "INTEROFFICE Document converter example");
        var desc = h('p', [
            "Example of a browser-based document converter using Web Assembly. Developed by the ",
            h('a', { href: 'https://cryptpad.org' }, "CryptPad"),
            " team for INTEROFFICE, a project funded by ",
            h('a', {href: 'https://dapsi.ngi.eu/'}, "NGI DAPSI"),
            " under ",
            h('a', {href: 'https://cordis.europa.eu/project/id/871498'}, "EU grant #9001"),
          ])
        var hint = h('p.cp-convert-hint', Messages.convert_hint);
        var source = h('p',
            [h('a', {href:'https://github.com/xwiki-labs/office-converters'}, "Source code on GitHub")]
        )
        var picker = h('input', {
            type: 'file'
        });
        var output = h('p', "Output:")
        $form.append([title, desc, hint, source, picker, output]);

        $(picker).on('change', function () {
            $form.find('button, div.notice').remove();
            var file = picker.files[0];
            var name = file && file.name;
            var reader = new FileReader();
            var parsed = file && file.name && /.+\.([^.]+)$/.exec(file.name);
            var ext = parsed && parsed[1];
            reader.onload = function (e) {
                if (CONVERTERS[ext]) {
                    Object.keys(CONVERTERS[ext]).forEach(function (to) {
                        var button = h('button.btn', to);
                        console.error(to);
                        $(button).click(function () {
                            console.error(to);
                            CONVERTERS[ext][to](new Uint8Array(e.target.result), name, function (a) {
                                var n = name.slice(0, -ext.length) + to;
                                var blob = new Blob([a], {type: "application/bin;charset=utf-8"});
                                window.saveAs(blob, n);
                            });

                        }).appendTo($form);
                    });
                } else {
                    var notice = h('div.notice', Messages.convert_unsupported);
                    $form.append(notice);
                }
            };
            if (ext === 'bin') {
                var reader2 = new FileReader();
                reader2.onload = function (e) {
                    var str = e.target.result;
                    var type = str.slice(0,4);
                    var c = CONVERTERS['bin'] = {};

                    if (type === "XLSY") {
                        c.ods = x2tConverter('bin', 'ods', 'sheet');
                        c.xlsx = x2tConverter('bin', 'xlsx', 'sheet');
                        //c.pdf = x2tConverter('bin', 'pdf', 'sheet');
                    } else if (type === "PPTY") {
                        c.odp = x2tConverter('bin', 'odp', 'slide');
                        c.pptx = x2tConverter('bin', 'pptx', 'slide');
                        //c.pdf = x2tConverter('bin', 'pdf', 'slide');
                    } else if (type === "DOCY") {
                        c.odt = x2tConverter('bin', 'odt', 'doc');
                        c.docx = x2tConverter('bin', 'docx', 'doc');
                        //c.pdf = x2tConverter('bin', 'pdf', 'doc');
                    } else {
                        return void console.error('Unsupported');
                    }

                    reader.readAsArrayBuffer(file, 'application/octet-stream');
                };
                return void reader2.readAsText(file);
            }
            reader.readAsArrayBuffer(file, 'application/octet-stream');
        });

    });
});
