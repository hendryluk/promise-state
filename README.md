#promise-state
Immutable snapshot representation of es6 promise
 
##Install
`yarn add promise-state`

or

`npm install --save redux-progress`

##Example
### React hooks example (Typescript)
```tsx
import {useState} from "react";
import PromiseState from 'promise-state';

function UserDetails() {
    const [state, setState] = useState<PromiseState<User>>(null);
    
    useEffect(function initialize() {
        PromiseState.subscribe(fetch('/users'), setState);       
    }, []);
    
    return state?.fold({
        pending: () => <div>Loading user info...</div>,
        rejected: () => <div>Failed to load user</div>,
        resolved: user => <div>
            <div>Name: {user.name}</div>
            <div>Email: {email.name}</div>
        </div>, 
    });

}
```

### Redux+Thunk example (Typescript)
```ts
import PromiseState from 'promise-state';
import { ThunkDispatch } from 'redux-thunk';

const FETCH_USERS = 'FETCH_USERS';
const loadUser = () => (dispatch: ThunkDispatch) =>
    PromiseState.subscribe(fetch('/users'), state =>
        dispatch({ type: FETCH_USERS, state }));

function userReducer(state = null, action): PromiseState<User> {
  if(action.type === FETCH_USERS)
      return action.state;
  return state;
}
```

## Usage

After you install this module (probably from npm) you can import base class called `Progress`

```javascript
import Progress from 'redux-progress';
```

`Progress` class provides useful utilities to handle different states in your application.

In addition you can import Progress static props and methods as separate functions.

```javascript
import {none, inProgress, success, fail, all} from 'redux-progress';
```

### Create instance
You can create instance through one of these:
```javascript
const resolved = PromiseState.resolve({ name: 'bob' });
const rejected = PromiseState.reject(Error(''));
const pending = PromiseState.pending;
```

`PromiseState` is immutable by design. Once instantiated there is no way to change its state.

### Instance properties

#### isResolved
`Boolean`. True if the instance object has `success` status.

#### isRejected
`Boolean`. True if the instance object has `failed` status.

#### isFulfilled
`Boolean`. True if the instance object has `success` or `failed` status.

#### isPending
`Boolean`. True if the instance object has `inProgress` status.

#### value
`R | void`. Obtains the value of resolved promise, else undefined.

#### error
`R | void`. Obtains error value of rejected promise, else undefined.


### Instance methods

#### map
`map<T>(mapper: (r: R) => T): PromiseState<T>`  
Allows to map over a value stored inside `PromiseState` object. Mapper applied only to successive instances.
Returns the new `PromiseState` object with transformed value inside.

```javascript
PromiseState
  .resolve(10)
  .then(x => x + 5, handleError)
  .value; // => 15
```

You can also return another PromiseState instance from the mapper function, i.e.:
```javascript
PromiseState
  .resolve(10)
  .then(x => x >= 0 ? x : PromiseState.reject(Error('negative value')))
  .value; // => 15
```

 #### fold
`fold<T>(folder: Folder<R, T>): T | null`  
Fold receives object (Folder) that specifies different actions for different `PromiseState` states.
Useful to applying side effects and reduce boilerplate code.

```jsx
promiseState.fold({
        pending: () => <div>Loading user info...</div>,
        rejected: () => <div>Failed to load user</div>,
        resolved: user => <div>
            <div>Name: {user.name}</div>
            <div>Email: {email.name}</div>
        </div>, 
    });
```

#### get
`get(): R`  
Extract the value from `PromiseState` if resolved, or throw if pending/rejected.

```javascript
PromiseState
  .resolve(10)
  .get(); // => 15

PromiseState
  .reject(Error('Some error'))
  .get(); // => throws
```


### Composition
`Progress` class has two static methods for composing many instances together.
API pretty similar to `PromiseState.all` and `PromiseState.race` methods.


#### all
`all: <I: Array<Progress<mixed>>>(...I)=> Progress<$TupleMap<I, ExtractResult>>`  
Returns first `failed` or `inProgress` or `none` item from passed items.
If all items are `success` then will return successive `Progress` object with an array of all items values

```javascript
Progress.all(
  Progress.success({ a: "1" }),
  Progress.success({ b: "2" })
); // => the same that Progress.success([ { a: "1" }, { b: "2" } ])

Progress.all(
  Progress.success({}),
  Progress.fail({a: '1'}),
  Progress.inProgress
); // => the same that Progress.fail({a: '1'})
```


#### race
`race: <T>(...Progress<T>[])=> Progress<T>`  
Returns first complete item (`failed` or `success`).
If there are no complete items then will return the first item from arguments.
If arguments empty will return `Progress.none`.

```javascript
Progress.race(
  Progress.success({ a: "1" }),
  Progress.success({ b: "2" })
); // => the same that Progress.success({ a: "1" })
```


## Usage with redux

 To wire up those utilities with redux you can use the `thunkProgress` function inside your actions.
 You can use this in pair with redux-thunk middleware.

 ```javascript
import {thunkProgress} from 'redux-progress';
import {createStore, combineReducers, applyMiddleware} from 'redux';
import thunk from 'redux-thunk';

// Reducer to handle async states
const asyncReducer = (state = {}, {type, progress}) => {
  switch (type) {
    case 'MY_ASYNC_ACTION_NAME':
      return {
        loading: progress.inProgress,
        result: progress.result,
        error: progress.error
      };

    default:
      return state;
  }
};

const store = createStore(
  combineReducers({asyncReducer}),
  applyMiddleware(thunk)
);

// Action creator
const doAsyncAction = () => {
  return thunkProgress(
    'MY_ASYNC_ACTION_NAME',
    fetch('/my-url').then(response => response.json())
  );
};

// Inside React component
dispatch(doAsyncAction());
 ```

Also could be useful to save the `Progress` instance to the state and use all
available instances methods inside redux containers or components.

```javascript
const asyncReducer = (state = {}, {type, userProgress}) => {
  switch (type) {
    case 'SET_USER':
      return {
        user: userProgress
      };

    default:
      return state;
  }
};

// Inside React component or redux container
const MyComponent = ({userName}) => {
  return (
    <div>
      {userName.fold({
         success: (u) => <div className="user-name">{u}</div>,
         failed: (error) => <div className="user-error">{error}</div>,
         loading: () => <span>"Loading ..."</span>
       })}
    </div>
  );
};

export default connect(
  state => ({
    userName: state.user.map(u => u.name.toUpperCase())
  })
)(MyComponent);
```
