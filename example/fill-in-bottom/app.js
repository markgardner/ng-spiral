angular.module('app', ['spiral'])
	.run(['$rootScope', function($rootScope) {
		var $digest = $rootScope.$digest;

        $rootScope.constructor.prototype.$digest = function() {
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
		var data, allSelected;

		$scope.toggleSelectAll = function() {
			allSelected = !allSelected;

			for(var i = 0; i < data.length; i++) {
				data[i].checked = allSelected;
			}

			$scope.mainSpiral.toggleSelection(1, allSelected);
		}

		$scope.remove = function(item) {
			$scope.mainSpiral.removeItem(item);
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
				$scope.mainSpiral.push(data.splice(0, 35));
			}
		}

		$http.get('/example/data.json')
			.then(function(res) {
				data = res.data.people;

				for(var i = 0, checked = true; i < data.length; i++) {
					data[i].checked = (checked = !checked);
				}

				$scope.mainSpiral.push(data.splice(0, 70));
			});
	}]);

