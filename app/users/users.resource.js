angular.module('users', ['ngResource'])
  .factory('User', function($resource) {
    return $resource('/users/:id', null, {
      'query': {
        method: 'GET',
        isArray: false
      }
    });
  })

  .factory('RandomUser', function($resource) {
    return $resource('http://api.randomuser.me', null, {
      'query': {
        method: 'GET',
        isArray: false
      }
    });
  });
