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
        qp.each(glob.sync(asset.target), file => this.add_file(asset.type, file));
      });
    },

    parse: function(filename) {
      var asset_file = fso.load(this.add_path(filename));
      if (asset_file.exists) {
        qp.each(qp.lines(asset_file.read_sync()), (line) => {
          line = qp.trim(line);
          if (qp.empty(line) || qp.starts(line, '//')) return;
          line = qp.format(line, this.state);
          var parts = qp.map(line.split(':'), part => qp.trim(part));
          if (parts[0] === 'asset') {
            var child_assets = this.parse(parts[1], this.state);
            if (qp.not_empty(child_assets)) {
              qp.push(this.assets, child_assets);
            }
          } else {
            var asset = { type: parts[0], target: this.add_path(parts[1]) };
            asset[parts[0]] = true;
            qp.push(this.assets, asset);
          }
        });
      }
    },

    add_file: function(type, filename) {
      if (this.file_list.indexOf(filename) === -1) {
        var excluded = false;
        var paths = this.excluded_paths;
        for (var i = 0, l = paths.length; i < l; i++) {
          excluded = filename.lastIndexOf(paths[i], 0) === 0;
          if (excluded) break;
        }
        if (!excluded) {
          this.file_list.push(filename);
          this.files[type].push(filename);
        }
      }
    },

    add_path: function(dir) {
      if (qp.starts(dir, '/') && !qp.starts(dir, this.root_directory)) {
        return path.join(this.root_directory, dir);
      }
      return dir || '';
    }

  });

});
