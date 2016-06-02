angular.module('spiral')
.directive('spiral', ['$injector', function($injector) {
	return {
		restrict: 'E',
		controller: ['$element', '$rootScope', '$scope', '$attrs', SpiralController],
		controllerAs: 'ctrl',
		template: function(element, attrs) {
			attrs.$$body = element.children(':not(spiral-header,spiral-sticky):first');

			return '<div class="header">' +
	element.find('spiral-header').html() +
'</div>\
<div class="sub-header">\
</div>\
<div class="body">\
	<div class="slide">\
		<div class="bucket" ng-repeat="bucket in ctrl.buckets">\
			<div class="content">\
			</div>\
		</div>\
	</div>\
</div>';
		},
		compile: function(element, attrs) {
			var bucketSize = attrs.bucketSize = attrs.bucketSize || '25',
				$bucketContent = element.find('.bucket .content'),
				serviceName, service, template;

			if(attrs.$$body.length) {
				serviceName = attrs.$normalize(attrs.$$body.prop('tagName').toLowerCase()) + 'Generator';

				if($injector.has(serviceName)) {
					service = $injector.get(serviceName);
					template = service.makeTemplate(element, attrs.$$body, bucketSize);

					$bucketContent.html(template);
				} else {
					$bucketContent.append(attrs.$body);
				}
			}

			return spiralLink;

			function spiralLink(scope, element, attrs, ctrl) {
				var $body = element.find('.body'),
					$slide = $body.children(),
					throttledScrollHandler = throttle(scrollHandler, 100),
					pendingHides = {count:0},
					afterScrollHandler;

				if(attrs.id) {
					scope.$parent[attrs.id]	= ctrl;
				}

				element.on('spiral:re-compute', function(e, beforeRecompute, afterScroll) {
					reComputeSizes(scope.ctrl.buckets, beforeRecompute, afterScroll);

					return false;
				});

				$body.on('scroll', throttledScrollHandler);

				function reComputeSizes(bucketsEntity, beforeRecompute, afterScroll) {
					if(bucketsEntity && bucketsEntity.length) {
						// Reset pending hides, after new sizes we might need to hide a
						// completely different set of buckets.
						clearTimeout(pendingHides.id);
						pendingHides = {count:0};

						if(beforeRecompute) {
							beforeRecompute();
						}

						afterScrollHandler = afterScroll;

						scope.$$postDigest(function() {
							// This is a hack to get put to the end of the post digest,
							// ng-show doesn't apply class changes until post digest
							scope.$$postDigest(reComputeSizesAfterDigest);
						});
					}
				}

				function reComputeSizesAfterDigest() {
					var $buckets = $slide.children(),
						bucketsEntity = scope.ctrl.buckets,
						bucketsHeight = 0,
						itemScope = scope.$$childHead;

					for(var i = 0, val, $el; i < bucketsEntity.length; i++) {
						val = bucketsEntity[i];
						val.$el = $el = $buckets.eq(i);

						// TODO: Remove the need to always do this check.
						// Possibly track watch count to see if size needs to be recalced.
						// $$watchersCount
						// console.log(val.watchCount, itemScope.$$watchersCount !== val.watchCount, $el.children().is(':hidden'));
						if($el.children().is(':hidden')) {
							val.height = $el.children().show().height();

							$el.children().hide();
						} else {
							val.watchCount = itemScope.$$watchersCount;
							val.height = $el.height();
						}

						val.visible = true;
						val.top = bucketsHeight;
						val.bottom = bucketsHeight + val.height;

						bucketsHeight += val.height;
						itemScope = itemScope.$$nextSibling;
					}

					if(afterScrollHandler) {
						afterScrollHandler(bucketsHeight);
					} else {
						scrollHandler();
					}
				}

				function scrollHandler() {
					var bodyHeight = $body.height(),
						slideHeight = $slide.height(),
						scrollPadding = bodyHeight * 2.5,
						scrollTop = $body.scrollTop(),
						scrollBottom = scrollTop + bodyHeight,
						scrollTopWithPadding = scrollTop - scrollPadding,
						scrollBottomWithPadding = scrollBottom + scrollPadding,
						buckets = ctrl.buckets,
						visibleBucketHeight = 0,
						i = 0, bucket;

					if(buckets && buckets.length) {
						for(; i < buckets.length; i++) {
							bucket = buckets[i];

							if(bucket.visible && (bucket.bottom < scrollTopWithPadding || bucket.top > scrollBottomWithPadding)) {
								bucket.visible = false;
								bucket.pending = true;

								pendingHides[bucket.$$hashKey] = bucket;

								if(pendingHides.count < 10) {
									clearTimeout(pendingHides.id);
									pendingHides.id = setTimeout(hidePendingBuckets, 500);
								}

								pendingHides.count++;
							} else if(!bucket.visible && bucket.bottom > scrollTopWithPadding && bucket.top < scrollBottomWithPadding) {
								delete pendingHides[bucket.$$hashKey];

								bucket.visible = true;

								if(bucket.pending) {
									bucket.pending = false;
								} else {
									bucket.$el
										.css('height', '')
										.children().css('display', '');
								}
							}
						}
					}

					if(scrollTop === 0) {
						scope.$eval(attrs.fillInTop);
					} else if(scrollBottom === slideHeight) {
						scope.$eval(attrs.fillInBottom);
					}
				}

				function hidePendingBuckets() {
					var ids = Object.keys(pendingHides);

					for(var i = 0, bucket; i < ids.length; i++) {
						if(ids[i] === 'id' || ids[i] === 'count') {
							continue;
						}

						bucket = pendingHides[ids[i]];
						bucket.pending = bucket.visible = false;
						bucket.$el
							.height(bucket.height)
							.children().hide();
					}

					pendingHides = {count:0};
				}
			}
		}
	};

	function SpiralController($element, $rootScope, $scope, $attrs) {
		var $body = $element.children('.body'),
			$slide = $body.children();

		this.buckets = [];

		this.unshift = function(arrayOfData) {
			var bucketSize = $attrs.bucketSize,
				first = this.buckets[0],
				firstHasRoomFor = first && first.remaining || 0,
				unShiftEntities, triggerArgs, heightBeforeDigest, scrollTopBeforeDigest;

			if(!first) {
				triggerArgs = [null, function() {
					$body.scrollTop($slide.height() - $body.height());
				}];
			} else {
				triggerArgs = [function() {
					heightBeforeDigest = $slide.height();
					scrollTopBeforeDigest = $body.scrollTop();
				}, function(heightAfterDigest) {
					$body.scrollTop(scrollTopBeforeDigest + (heightAfterDigest - heightBeforeDigest));
				}];
			}

			if(firstHasRoomFor > 0) {
				unShiftEntities = arrayOfData.splice(-firstHasRoomFor, firstHasRoomFor);

				first.remaining -= unShiftEntities.length;
				first.splice.apply(first, [firstHasRoomFor - unShiftEntities.length, unShiftEntities.length].concat(unShiftEntities));
			}

			while(arrayOfData.length) {
				if(arrayOfData.length < bucketSize) {
					unShiftEntities = [];
					unShiftEntities.length = unShiftEntities.remaining = bucketSize - arrayOfData.length;
					unShiftEntities.splice.apply(unShiftEntities, [unShiftEntities.length, 0].concat(arrayOfData));

					arrayOfData.length = 0;

					this.buckets.unshift(unShiftEntities);
				} else {
					this.buckets.unshift(arrayOfData.splice(-bucketSize, bucketSize));
				}
			}

			$element.trigger('spiral:re-compute', triggerArgs);

			if(!$rootScope.$$phase) {
				$scope.$digest();
			}
		};

		this.push = function(arrayOfData) {
			var bucketSize = $attrs.bucketSize,
				last = this.buckets[this.buckets.length - 1],
				lastHasRoomFor = last && (bucketSize - last.length) || 0;

			if(lastHasRoomFor > 0) {
				last.push.apply(last, arrayOfData.splice(0, lastHasRoomFor));
			}

			while(arrayOfData.length) {
				this.buckets.push(arrayOfData.splice(0, bucketSize));
			}

			$element.trigger('spiral:re-compute');

			if(!$rootScope.$$phase) {
				// Showing the hidden buckets speeds up the digest a lot when the list gets big for some reason.
				$scope.$digest();
			}
		};

		this.reset = function(newArray) {
			this.buckets.length = 0;

			this.push(newArray || []);
		}
	}

	function throttle(fn, delay) {
		var timeoutId;

		return function() {
			if(!timeoutId) {
				timeoutId = setTimeout(function() {
					timeoutId = null;

					fn();
				}, delay);
			}
		}
	}
}]);