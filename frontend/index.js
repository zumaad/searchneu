import "babel-polyfill";
import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { store } from "./store.js";
import { router } from "./router.js";
import { AppContainer } from 'react-hot-loader';
import { Router, browserHistory } from 'react-router';
import Home from "./components/Home";

// // <Router history={ browserHistory }>
        //   { router }
        // </Router>

const root = document.getElementById('app');
function createApp() {
  return (
      <Provider store={ store }>
      <Home />
      </Provider>
  );
}


if (process.env.NODE_ENV === 'production') {
  ReactDOM.render(createApp(), root);
} else {
  ReactDOM.render((
    <AppContainer>
      { createApp() }
    </AppContainer>
  ), root);

  if (module.hot) {
    module.hot.accept(() => {
      ReactDOM.render((
        <AppContainer>
          { createApp() }
        </AppContainer>
      ), root);
    });
  }
}