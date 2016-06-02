angular.module('spiral')
.factory('spiralGridGenerator', ['$compile', function($compile) {
	return {
		makeTemplate: function($container, def, numberOfRows) {
			var model = generateColumnModel(def),
				i;

			var columnsTemplate = model.reduce(function(prev, cur, idx) {
					return prev + '<div class="col col-' + (idx + 1) + '" style="width: ' + cur.width + ';">' + cur.content + '</div>';
				}, ''),
				body = '';

			for(i = 0; i < model.length; i++) {
				columnsTemplate = '<div class="col-box col-box-' + (i) + (i % 2 ? '' : ' col-box-even') + '" style="right: ' + model[i].width + '">' + columnsTemplate + '</div>';
			}

			for(i = 0; i < numberOfRows; i++) {
				body += '<div class="row ng-hide" ng-show="::bucket[' + i + ']">' + columnsTemplate.replace(/dataItem/g, 'bucket[' + i + ']') + '</div>\n';
			}

			return body;
		}
	};

	function generateColumnModel(def) {
		var $items = def.children(),
			numOfAutoWidths = 0,
			cols = [],
			i, $el, autoWidth;

		for(i = 0; i < $items.length; i++) {
			$el = $items.eq(i);

			switch($el.prop('tagName')) {
				case 'SPIRAL-COL':
					cols.push({
						title: $el.attr('title') || 'Column ' + i,
						width: $el.attr('width') || (++numOfAutoWidths && 'auto'),
						content: $el.html()
					});
					break;
				default:
					throw new Error('Unknown column type ' + $items[i].tagName);
			}
		}

		if(numOfAutoWidths > 0) {
			autoWidth = (100 / numOfAutoWidths) + '%';

			if(numOfAutoWidths !== cols.length) {
				autoWidth = 'calc(' + autoWidth + ' - ' + cols.reduce(function(prev, cur) {
					if(cur.width !== 'auto') {
						prev.push((parseFloat(cur.width) / numOfAutoWidths) + cur.width.replace(/\d/g, ''));
					}

					return prev;
				}, []).join(' - ') + ')';
			}

			for(i = 0; i < cols.length; i++) {
				if(cols[i].width === 'auto') {
					cols[i].width = autoWidth;
				}
			}
		}

		return cols;
	}
}]);