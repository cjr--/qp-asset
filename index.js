define(module, function(exports, require) {

  var path = require('path');
  var glob = require('glob');
  var qp = require('qp-utility');
  var fss = require('qp-library/fss');
  var fso = require('qp-library/fso');
  var log = require('qp-library/log');

  qp.make(exports, {

    ns: 'qp-asset/asset',

    root_directory: '',

    asset_file: null,
    asset_dir: null,

    state: {},
    assets: [],

    file_list: [],
    excluded_paths: [],

    links: {},

    files: {
      copy: [],
      merge: []
    },

    init: function(options) {
      this.root_directory = options.root || process.cwd();
      this.asset_dir = path.dirname(options.file);
      this.parse(options.file);
      qp.each(this.assets, (asset) => {
        // log(qp.rpad(asset.type, 6), asset.target)
        if (asset.merge || asset.copy) {
          qp.each(glob.sync(asset.target), file => {
            this.add_file({ type: asset.type, file: file });
          });
        } else if (asset.link) {
          if (!this.links[asset.ext]) this.links[asset.ext] = [];
          this.links[asset.ext].push(asset.target);
        }
      });
    },

    parse: function(filename) {
      this.asset_file = fso.load(this.add_path(filename));
      if (this.asset_file.exists) {
        // log(this.asset_file.fullname)
        qp.each(qp.lines(this.asset_file.read_sync()), (line) => {
          line = qp.trim(line);
          if (qp.empty(line) || qp.starts(line, '//')) return;
          line = qp.format(line, this.state);
          var parts = qp.map(line.split(/:(.+)/), part => qp.trim(part));
          var key = parts[0];
          var value = parts[1];

          if (key === 'asset') {
            var child_assets = this.parse(value);
            if (qp.not_empty(child_assets)) {
              qp.push(this.assets, child_assets);
            }
          } else if (key === 'state') {
            var kvp = qp.map(value.split('='), part => qp.trim(part));
            this.state[kvp[0]] = kvp[1];
          } else if (key.slice(0, 5) === 'link_') {
            qp.push(this.assets, { type: 'link', target: value, link: true, ext: key.slice(5) });
          } else {
            var attr = qp.between(value, '[', ']');
            if (attr) value = qp.rtrim(qp.before_last(value, '['));
            qp.push(this.assets, { type: key, target: this.add_path(value), attributes: attr, [key]: true });
          }
        });
      }
    },

    add_file: function(o) {
      var type = o.type;
      var file = o.file;
      if (this.file_list.indexOf(file) === -1) {
        var excluded = false;
        var paths = this.excluded_paths;
        for (var i = 0, l = paths.length; i < l; i++) {
          excluded = file.lastIndexOf(paths[i], 0) === 0;
          if (excluded) break;
        }
        if (!excluded) {
          // log(qp.rpad(type, 6), file)
          this.file_list.push(file);
          this.files[type].push(file);
        }
      }
    },

    add_files: function(o) {
      qp.each(o.files, file => this.add_file({ type: o.type, file: file }));
    },

    add_path: function(dir) {
      if (qp.starts(dir, '/') && !qp.starts(dir, this.root_directory)) {
        return path.join(this.root_directory, dir);
      }
      return dir || '';
    }

  });

});
