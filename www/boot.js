require.config({
    urlArgs: "v=" + +new Date(),
    paths: {
        "jquery": "lib/jquery.min",
    },
});
require(['convert.js']);
