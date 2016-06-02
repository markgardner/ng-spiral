angular.module('app', ['spiral'])
	.run(['$rootScope', function($rootScope) {
		var $digest = $rootScope.$digest;

        $rootScope.constructor.prototype.$digest = function wrappedDigest() {
          var start = performance.now()
          	, duration;

          $digest.apply(this, arguments);

          duration = performance.now() - start;

          if(duration > 14) {
          	console.warn('digest', duration);
          } else {
          	console.log('digest', duration);	
          }
        };
	}])
	.controller('MainCtrl', ['$scope', '$http', function($scope, $http) {
		var data;

		$scope.remove = function(item) {
			console.log('remove item', item);
		};

		$scope.selected = function(item) {
			item.checked = !item.checked;
		};

		$scope.addMore = function() {
			this.readyForMore();
		};

		$scope.readyForMore = function() {
			console.log('readyForMore');

			if(data.length) {
				setTimeout(function() {
					$scope.mainSpiral.push(data.splice(0, 35));
				}, 50);
			}
		}

		$http.get('data.json')
			.then(function(res) {
				data = res.data.people;

				data.forEach(function(p, i) { p.checked = (i % 2); });

				for(var i = 0; i < 3; i++) {
					data = data.concat(angular.copy(data));
				}

				$scope.mainSpiral.push(data.splice(0, 180));
			});
	}]);

