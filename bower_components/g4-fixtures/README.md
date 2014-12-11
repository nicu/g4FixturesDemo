# g4Fixtures

## What is it?
Fixture based local database.
Acts just like a REST service and persists the data in the browser's local storage.



## Structure
### fixtureDb
Use this provider to set initial data for a collection.

There is a very rudimentary migration mechanism in place. The default data is stored in a special place so that even if the collection is updated through the application (usually using the UI), we still have a copy of what we considered to be the default values. If, in the future, that default data will change, it will clear the current collection and reinitalise it with the new defaults. You lose the old data for that collection, but that's the intent here, because, hopefully, the structure of the data changed, and that's why we wanted new defaults.

Example:
```js
angular.module('demo').config(['fixtureDbProvider', function(fixtureDbProvider) {
    fixtureDbProvider.setInitialData('users', [{
        "id": 1,
        "name": "Admin"
    }, {
        "id": 2,
        "name": "Guest"
    }]);
}]);
```

If at a later point we change the user structure to:
```
angular.module('demo').config(['fixtureDbProvider', function(fixtureDbProvider) {
    fixtureDbProvider.setInitialData('users', [{
        "id": 1,
        "name": {
            "first": "John",
            "last": "Doe"
        }
    }]);
}]);
```
it will remove the **users** collection data, which might have been altered by now using regular POST/PUT/DELETE requests, and persists the new one.

### fixtureStore
Use this provider to instantiate an object that is linked to the localStorage's document.
The object exposes the following methods: **findAll**, **findOne**, **create**, **update**, **delete**.

Usually you won't be using this directly, but feel free to use it as needed.

```js
angular.module('demo').run(['fixtureStore', function(fixtureStore) {
    // I set this because of jsHint, might be better ways of doing it
    var FixtureStore = fixtureStore;

    // all the changes made through this store
    // are going to be persisted to user's localStorage
    var store = new FixtureStore('users');

    // create a new user
    // it will auto-assign the id "1", if the collection is empty
    // or the last id + 1
    var new_user = store.create({
        name: 'John Doe'
    });

    // get user with a specific id
    var user = store.findOne(1);
    // update user with a specific id
    user.name = 'New name';
    store.update(1, user);

    // delete the user with the id of "1"
    store.delete(1);
}]);
```


### fixtures
Extends **httpBackend** provider to automatically map requests to **fixtureStore** methods.

```js
angular.module('demo').run(['fixtures', function(fixtures) {
    // specify the collection url (/users)
    // the singular, item, url (/user), which is automatically transformed to (/user/{id})
    // and the name of the localStorage document
    fixtures.resource('/users', '/user', 'users');
}]);
```

or, you could define custom routes:

```js
angular.module('demo').run(['fixtures', function(fixtures) {
    fixtures.whenGET('/blog/{year}/{month}/{id}-{title}', function(args, reqData) {
        // args represents an object that contains all of the URL arguments as key/value pairs
        // reqData is only used when sending data (POST/PUT) and contains the JSON object that was sent to the server
        // return [status, body, headers, statusText];
        return [200, {'title': 'Blog', 'body': '<h1>Welcome</h1>'}, {}, 'OK'];
    });
}]);
```


#### Setup

Invoke `fixtures.run()` after all the fixtures have been loaded. When this method is called, two things happen.
First, all of the collections that have been set using the **fixtureDbProvider** and have no routes defined, will be implicitly converted to resources.
Second, it will add wildcard routes, meaning that any route that hasn't been defined so far will passthrough and won't be handled by the **g4Fixtures / httpBackend** provider.


### Notes

You don't have to provide default data for any / all of the collections. All you need is to define a set of URLs (collection url and item url) and a collection name (used as the localStorage key). You'll end up with an empty collection that you can update through the UI.

## TODO

- Update the URL format to match Angular's $resource one. Instead of having `/users/{id}` we'd have `/users/:id`
- Create a configurable Gulp task that would use JSON files stored on disk as defaults for the data
 
