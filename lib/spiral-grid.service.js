angular.module('spiral')
.factory('spiralGridGenerator', ['$document', function($document) {
	var scrollbar_size = measureScrollbar();

	return {
		makeTemplate: function($container, def, numberOfRows) {
			var model = generateColumnModel(def),
				rowAttrs = model.attrs,
				rowAttrTemplate = '',
				i;

			var columnsTemplate = model.reduce(function(prev, cur, idx) {
					var attrsTemplate = '',
						attrs = cur.attrs;

					attrs.style = 'width: ' + cur.width + ';' + (attrs.style || '');
					attrs['class'] = 's-col s-col-' + (idx + 1) + (attrs['class'] && ' ' + attrs['class'] || '');

					for(var p in attrs) {
						attrsTemplate += ' ' + p + '="' + attrs[p] + '"';
					}

					return prev + '<div' + attrsTemplate + '>' + cur.content + '</div>';
				}, ''),
				body = '';

			for(i = 0; i < model.length; i++) {
				columnsTemplate = '<div class="s-col-box s-col-box-' + (i) + (i % 2 ? '' : ' s-col-box-even') + '" style="right: ' + model[i].width + '">' + columnsTemplate + '</div>';
			}

			if(!def.is('[data-header]')) {
				rowAttrs['class'] = 's-row ng-hide' + (rowAttrs['class'] && ' ' + rowAttrs['class'] || '');

				for(var p in rowAttrs) {
					rowAttrTemplate += ' ' + p + '="' + rowAttrs[p] + '"';
				}

				for(i = 0; i < numberOfRows; i++) {
					body += '<div' + rowAttrTemplate.replace(/dataItem/g, 'bucket[' + i + ']') + ' ng-show="::bucket[' + i + ']">' + columnsTemplate.replace(/dataItem/g, 'bucket[' + i + ']') + '</div>\n';
				}
			} else {
				body = columnsTemplate;
				$container.css('padding-right', scrollbar_size);
			}

			$container.html(body);
		},
		api: function($element, ctrl) {
			ctrl.toggleSelection = function(colIdx, selected) {
				$element.find('.s-col-' + colIdx + ' input').prop('checked', selected);
			}
			ctrl.removeItem = function(item, skipRecompute) {
				var buckets = ctrl.buckets,
					bucket,
					i = 0, x;

				for(; i < buckets.length; i++) {
					bucket = buckets[i];

					for(x = 0; x < bucket.length; x++) {
						if(bucket[x] === item) {
							bucket[x] = null;
							bucket.pristine = false;

							$element.find('.s-bucket:eq(' + i + ') .s-row:eq(' + x + ')').hide();

							if(!skipRecompute) {
								$element.trigger('spiral:re-compute');
							}

							return;
						}
					}
				}
			}
		}
	};

	function generateColumnModel(def) {
		var $items = def.children(),
			numOfAutoWidths = 0,
			cols = [],
			i, $el, autoWidth;

		cols.attrs = allAttrsButWidth(def);

		for(i = 0; i < $items.length; i++) {
			$el = $items.eq(i);

			switch($el.prop('tagName')) {
				case 'SPIRAL-COL':
					cols.push({
						title: $el.attr('title') || 'Column ' + i,
						width: $el.attr('width') || (++numOfAutoWidths && 'auto'),
						content: $el.html(),
						attrs: allAttrsButWidth($el)
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

	function allAttrsButWidth($el) {
		var nodeAttrs = $el[0].attributes,
			attrs = {},
			i = 0, c = nodeAttrs.length;

		for(;i < c; i++) {
			if(nodeAttrs[i].nodeName === 'width') {
				continue;
			}

			attrs[nodeAttrs[i].nodeName] = nodeAttrs[i].nodeValue;
		}

		return attrs;
	}

	function measureScrollbar() {
		var scrollDiv = angular.element('<div style="width:100px;height:100px;overflow:scroll;position:absolute;top:-9999px;"></div>')[0],
			body = $document[0].body;

		body.appendChild(scrollDiv);

		var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;

		body.removeChild(scrollDiv);

		return scrollbarWidth;
	}
}]);