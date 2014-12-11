angular.module('g4FixturesDemo', ['users', 'fixtures'])
  .run(['fixtures', function(fixtures) {
    fixtures.run();
  }]);
