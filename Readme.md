# g4FixturesDemo

This application exemplifies a very simple use case for the [g4Fixtures][g4f-repo] library.

It displays a list of users, lets you create new random ones or delete existing users. Any changes performed on the list will persist between page refreshes.

Pressing the **Create random user** button, would issue a GET request to the `http://api.randomuser.me` URL and the data returned will be used in a POST request to `/users`, which will be intercepted by the g4Fixtures library and saved in the browser's localStorage.

The main things to take away here is that we set up the fixtures to intercept requests to `/users` but **not** to `http://api.randomuser.me`.

When you first run the application you should see 3 users in the list. That's because we used the `fixtureDbProvider` to set up some initial data. Try clearing the data from your localStorage and you'll see that the list of users will revert to this default one.

After you import the data and set up any custom routes, make sure you call `fixtures.run()` (make sure to use a **run** block, not a **config** one). This will go through all the collections that you might have set using the `fixtureDbProvider` and if there are no routes defined for the collection, it will create a default set of REST routes to access that collection. The second thing it does, it defines **passThrough** routes for `*`, letting all the other routes work as expected.

```js
angular.module('g4FixturesDemo', ['users', 'fixtures'])
  .run(['fixtures', function(fixtures) {
    fixtures.run();
  }]);
```
A very rudimentary migration functionality is implemented.
If you change the data in `users.fixtures.js`, the library will detect this and will replace the existing data with the new defaults.


[g4f-repo]: https://github.com/AllegiantAir/g4-fixtures