/* global amplify */

angular.module('users')
  .controller('UsersCtrl', ['$scope', 'User', 'RandomUser', function($scope, User, RandomUser) {
    $scope.users = [];

    var refreshUsersList = function() {
      User.query(function(data) {
        $scope.users = data.body.items;
      });
    };

    $scope.addUser = function() {
      RandomUser.query(function(data) {
        angular.forEach(data.results, function(item) {
          User.save(item.user);
        });

        refreshUsersList();
      });
    };

    $scope.deleteUser = function(id) {
      User.delete({id: id}, function() {
        refreshUsersList();
      });
    };

    refreshUsersList();
  }]);