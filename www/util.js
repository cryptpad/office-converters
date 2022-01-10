define([], function () {
    var Util = {};

    Util.mkEvent = function (once) {
        var handlers = [];
        var fired = false;
        return {
            reg: function (cb) {
                if (once && fired) { return void setTimeout(cb); }
                handlers.push(cb);
            },
            unreg: function (cb) {
                if (handlers.indexOf(cb) === -1) {
                    return void console.error("event handler was already unregistered");
                }
                handlers.splice(handlers.indexOf(cb), 1);
            },
            fire: function () {
                if (once && fired) { return; }
                fired = true;
                var args = Array.prototype.slice.call(arguments);
                handlers.forEach(function (h) { h.apply(null, args); });
            }
        };
    };
    Util.fetch = function (src, cb, progress) {
        var CB = Util.once(Util.mkAsync(cb));

        var xhr;

        var fetch = function () {
            xhr = new XMLHttpRequest();
            xhr.open("GET", src, true);
            if (progress) {
                xhr.addEventListener("progress", function (evt) {
                    if (evt.lengthComputable) {
                        var percentComplete = evt.loaded / evt.total;
                        progress(percentComplete);
                    }
                }, false);
            }
            xhr.responseType = "arraybuffer";
            xhr.onerror = function (err) { CB(err); };
            xhr.onload = function () {
                if (/^4/.test(''+this.status)) {
                    return CB('XHR_ERROR');
                }

                var arrayBuffer = xhr.response;
                if (arrayBuffer) {
                    var u8 = new Uint8Array(arrayBuffer);
                    return void CB(void 0, u8);
                }
                CB('ENOENT');
            };
            xhr.send(null);
        };

        return void fetch();
    };
    Util.mkAsync = function (f, ms) {
        if (typeof(f) !== 'function') {
            throw new Error('EXPECTED_FUNCTION');
        }
        return function () {
            var args = Array.prototype.slice.call(arguments);
            setTimeout(function () {
                f.apply(null, args);
            }, ms);
        };
    };
    Util.once = function (f, g) {
        return function () {
            if (!f) { return; }
            f.apply(this, Array.prototype.slice.call(arguments));
            f = g;
        };
    };

    return Util;
});
