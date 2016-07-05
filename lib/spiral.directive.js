angular.module('spiral')
.directive('spiral', ['$injector', '$window', function($injector, $window) {
	return {
		restrict: 'E',
		controller: ['$element', '$rootScope', '$scope', '$attrs', SpiralController],
		controllerAs: 'ctrl',
		template: function(element, attrs) {
			// Store user's templates defs before angular applies the directive's template
			attrs.$$body = element.children(':not(spiral-header,spiral-sticky):first').clone();
			attrs.$$header = element.children('spiral-header:first').children().clone();
			attrs.$$sticky = element.children('spiral-sticky').children().clone();

			return '<div class="s-header">\
</div>\
<div class="s-sub-header">\
</div>\
<div class="s-body">\
	<div class="s-slide">\
		<div class="s-bucket" ng-repeat="bucket in ctrl.buckets">\
			<div class="s-content">\
			</div>\
		</div>\
	</div>\
</div>';
		},
		compile: function(element, attrs) {
			var bucketSize = attrs.bucketSize = attrs.bucketSize || '25';

			buildTemplate(attrs.$$header, attrs, element.find('.s-header'));
			buildTemplate(attrs.$$sticky, attrs, element.find('.s-sub-header'));

			attrs.$$bodyService = buildTemplate(attrs.$$body, attrs, element.find('.s-bucket .s-content'), bucketSize);

			return spiralLink;

			function spiralLink(scope, element, attrs, ctrl) {
				var $body = element.find('.s-body'),
					$slide = $body.children(),
					throttledScrollHandler = throttle(scrollHandler, 100),
					pendingHides = {count:0},
					resizeFinishTimeout,
					beforeReComputeSizesInfo;

				if(attrs.id) {
					scope.$parent[attrs.id]	= ctrl;
				}

				if(attrs.$$bodyService && attrs.$$bodyService.api) {
					attrs.$$bodyService.api(element, ctrl);
				}

				element.on('spiral:re-compute', function(e, maintainScrollPosition, isFirstRecompute) {
					beforeReComputeSizesInfo = maintainScrollPosition
						? { top: $body.scrollTop(), height: $slide.height(), first: isFirstRecompute }
						: null;

					reComputeSizes(ctrl.buckets);

					return false;
				});

				$body.on('scroll', throttledScrollHandler);
				angular.element($window).on('resize', resizeHandler);

				function resizeHandler() {
					var bucketsEntity = ctrl.buckets;

					cancelPendingHideBuckets();

					if(resizeFinishTimeout) {
						clearTimeout(resizeFinishTimeout);
					} else {
						for(var i = 0; i < bucketsEntity.length; i++) {
							bucketsEntity[i].visible = true;
						}

						element
							.find('.s-bucket')
							.css('height', '')
								.children()
								.show();
					}

					resizeFinishTimeout = setTimeout(resizeFinish, 300);
				}

				function resizeFinish() {
					resizeFinishTimeout = null;

					reComputeSizesAfterDigest(true);
				}

				function reComputeSizes(bucketsEntity) {
					if(bucketsEntity && bucketsEntity.length) {
						// Reset pending hides, after new sizes we might need to hide a
						// completely different set of buckets.
						cancelPendingHideBuckets();

						scope.$$postDigest(function() {
							// This is a hack to get put to the end of the post digest,
							// ng-show doesn't apply class changes until post digest
							scope.$$postDigest(reComputeSizesAfterDigest);
						});
					}
				}

				function reComputeSizesAfterDigest(force) {
					var $buckets = $slide.children(),
						bucketsEntity = ctrl.buckets,
						bucketsHeight = 0;

					for(var i = 0, val, $el; i < bucketsEntity.length; i++) {
						val = bucketsEntity[i];

						if(!val.pristine || force) {
							val.$el = $el = (val.$el || $buckets.eq(i));

							if(val.visible === false) {
								val.height = $el.children().show().height();

								$el.children().hide();
							} else {
								val.height = $el.height();
							}

							val.pristine = true;
						}

						val.top = bucketsHeight;
						val.bottom = (bucketsHeight += val.height);
					}

					if(beforeReComputeSizesInfo) {
						if(beforeReComputeSizesInfo.first) { // Scroll to bottom on first data load
							$body.scrollTop($slide.height()); // Don't worry about subtracting body height, browser will take care of handling the max value
						} else {
							$body.scrollTop(beforeReComputeSizesInfo.top + ($slide.height() - beforeReComputeSizesInfo.height));
						}

						beforeReComputeSizesInfo = null;
					}

					throttledScrollHandler();
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

					if(resizeFinishTimeout) {
						return;
					}

					if(buckets && buckets.length) {
						for(; i < buckets.length; i++) {
							bucket = buckets[i];

							if(bucket.visible) {
								if(bucket.bottom < scrollTopWithPadding || bucket.top > scrollBottomWithPadding) {
									if(!pendingHides[bucket.$$hashKey]) {
										pendingHides[bucket.$$hashKey] = bucket;

										if(pendingHides.count < 10) {
											clearTimeout(pendingHides.id);
											pendingHides.id = setTimeout(hidePendingBuckets, 500);
										}

										pendingHides.count++;
									}
								} else if(pendingHides[bucket.$$hashKey]) {
									delete pendingHides[bucket.$$hashKey];
								}
							} else if(!bucket.visible && bucket.bottom > scrollTopWithPadding && bucket.top < scrollBottomWithPadding) {
								if(pendingHides[bucket.$$hashKey]) {
									delete pendingHides[bucket.$$hashKey];
								}

								bucket.visible = true;
								bucket.$el
									.css('height', '')
									.children().css('display', '');
							}
						}
					}

					if(!beforeReComputeSizesInfo || !beforeReComputeSizesInfo.first) {
						if(scrollTop === 0) {
							scope.$eval(attrs.fillInTop);
						} else if(Math.abs(scrollBottom - slideHeight) < 5) {
							scope.$eval(attrs.fillInBottom);
						}
					}
				}

				function cancelPendingHideBuckets() {
					clearTimeout(pendingHides.id);
					pendingHides = {count:0};
				}

				function hidePendingBuckets() {
					var ids = Object.keys(pendingHides);

					for(var i = 0, bucket; i < ids.length; i++) {
						if(ids[i] === 'id' || ids[i] === 'count') {
							continue;
						}

						bucket = pendingHides[ids[i]];
						bucket.visible = false;
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
		var $body = $element.children('.s-body'),
			$slide = $body.children();

		this.buckets = [];

		this.unshift = function(arrayOfData) {
			var bucketSize = $attrs.bucketSize,
				first = this.buckets[0],
				firstHasRoomFor = first && first.remaining || 0,
				unShiftEntities;

			if(firstHasRoomFor > 0) {
				unShiftEntities = arrayOfData.splice(-firstHasRoomFor, firstHasRoomFor);

				first.pristine = false;
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

				this.buckets[0].visible = true;
			}

			$element.trigger('spiral:re-compute', [true,!first]);

			if(!$rootScope.$$phase) {
				$scope.$digest();
			}
		};

		this.push = function(arrayOfData) {
			var bucketSize = $attrs.bucketSize,
				last = this.buckets[this.buckets.length - 1],
				lastHasRoomFor = last && (bucketSize - last.length) || 0;

			if(lastHasRoomFor > 0) {
				last.pristine = false;
				last.push.apply(last, arrayOfData.splice(0, lastHasRoomFor));
			}

			while(arrayOfData.length) {
				this.buckets.push(arrayOfData.splice(0, bucketSize));
				this.buckets[this.buckets.length - 1].visible = true;
			}

			$element.trigger('spiral:re-compute');

			if(!$rootScope.$$phase) {
				$scope.$digest();
			}
		};

		this.reset = function(newArray) {
			this.buckets.length = 0;

			this.push(newArray || []);
		}
	}

	function buildTemplate(def, attrs, $container, bucketSize) {
		var serviceName, service;

		if(def && def.length) {
			serviceName = attrs.$normalize(def.prop('tagName').toLowerCase()) + 'Generator';

			if($injector.has(serviceName)) {
				service = $injector.get(serviceName);
				service.makeTemplate($container, def, bucketSize);
			} else {
				$container.append(attrs.$body);
			}
		}

		return service;
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
		};
	}
}]);