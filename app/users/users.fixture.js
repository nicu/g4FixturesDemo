angular.module('fixtures', ['g4Fixtures'])
  .config(['fixtureDbProvider', function(fixtureDbProvider) {
    fixtureDbProvider.setInitialData('users', [{
      "id": 1,
      "gender": "male",
      "name": {
        "title": "mr",
        "first": "terry",
        "last": "henry"
      },
      "picture": {
        "large": "http://api.randomuser.me/portraits/men/20.jpg",
        "medium": "http://api.randomuser.me/portraits/med/men/20.jpg",
        "thumbnail": "http://api.randomuser.me/portraits/thumb/men/20.jpg"
      }
    }, {
      "id": 2,
      "gender": "female",
      "name": {
        "title": "ms",
        "first": "pamela",
        "last": "jennings"
      },
      "picture": {
        "large": "http://api.randomuser.me/portraits/women/95.jpg",
        "medium": "http://api.randomuser.me/portraits/med/women/95.jpg",
        "thumbnail": "http://api.randomuser.me/portraits/thumb/women/95.jpg"
      }
    }, {
      "id": 3,
      "gender": "male",
      "name": {
        "title": "mr",
        "first": "nathaniel",
        "last": "clark"
      },
      "picture": {
        "large": "http://api.randomuser.me/portraits/men/17.jpg",
        "medium": "http://api.randomuser.me/portraits/med/men/17.jpg",
        "thumbnail": "http://api.randomuser.me/portraits/thumb/men/17.jpg"
      }
    }]);
  }]);