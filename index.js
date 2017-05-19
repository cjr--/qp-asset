define(module, function(exports, require, make) {

  var path = require('path');
  var glob = require('glob');
  var qp = require('qp-utility');
  var fss = require('qp-library/fss');
  var fso = require('qp-library/fso');
  var log = require('qp-library/log');

  make({

    ns: 'qp-asset/asset',

    root_directory: '',

    asset_file: null,

    state: {},
    assets: [],

    file_list: [],
    excluded_paths: [],

    files: {
      copy: [],
      merge: []
    },

    init: function(options) {
      this.root_directory = options.root || process.cwd();
      this.parse(options.file);
      qp.each(this.assets, (asset) => {
        if (asset.merge || asset.copy) {
          qp.each(glob.sync(asset.target), file => this.add_file({ type: asset.type, file: file }));
        }
      });
    },

    parse: function(filename) {
      this.asset_file = fso.load(this.add_path(filename));
      if (this.asset_file.exists) {
        qp.each(qp.lines(this.asset_file.read_sync()), (line) => {
          line = qp.trim(line);
          if (qp.empty(line) || qp.starts(line, '//')) return;
          line = qp.format(line, this.state);
          var parts = qp.map(line.split(':'), part => qp.trim(part));
          if (parts[0] === 'asset') {
            var child_assets = this.parse(parts[1]);
            if (qp.not_empty(child_assets)) {
              qp.push(this.assets, child_assets);
            }
          } else if (parts[0] === 'state') {
            var kvp = qp.map(parts[1].split('='), part => qp.trim(part));
            this.state[kvp[0]] = kvp[1];
          } else {
            var asset = { type: parts[0], target: this.add_path(parts[1]) };
            asset[parts[0]] = true;
            qp.push(this.assets, asset);
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
