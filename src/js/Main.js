import { render } from './lib/preact.js';
import { Router, route } from './lib/preact-router.es.js';
import { createHashHistory } from './lib/history.production.min.js';
import { Component } from './lib/preact.js';
import { Link } from './lib/preact.match.js';

import Helpers from './Helpers.js';
import { html } from './Helpers.js';
import QRScanner from './QRScanner.js';
import PeerManager from './PeerManager.js';
import Session from './Session.js';
import { translate as t } from './Translation.js';

import Settings from './views/Settings.js';
import Home from './views/Home.js';
import LogoutConfirmation from './views/LogoutConfirmation.js';
import Store from './views/Store.js';
import Product from './views/Product.js';
import Login from './views/Login.js';
import Explorer from './views/Explorer.js';
import Torrent from './views/Torrent.js';

import VideoCall from './components/VideoCall.js';
import Identicon from './components/Identicon.js';
import MediaPlayer from './components/MediaPlayer.js';
import Footer from './components/Footer.js';
import State from './State.js';
import Icons from './Icons.js';

const userAgent = navigator.userAgent.toLowerCase();
const isElectron = (userAgent.indexOf(' electron/') > -1);
if (!isElectron && ('serviceWorker' in navigator)) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('serviceworker.js')
    .catch(function(err) {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}

State.init();
Session.init({autologin: window.location.hash.length > 2});
PeerManager.init();

Helpers.checkColorScheme();

const APPLICATIONS = [ // TODO: move editable shortcuts to localState gun
  {url: '/', text: t(''), icon: Icons.home},
  {url: '/store', text: t(''), icon: Icons.play},
  {url: '/product/new', text: t(''), icon: Icons.add},
  {url: '/settings', text: t(''), icon: Icons.user},
];

class Menu extends Component {
  componentDidMount() {
    State.local.get('unseenTotal').on(unseenTotal => {
      this.setState({unseenTotal});
    });
  }

  menuLinkClicked() {
    State.local.get('toggleMenu').put(false);
    State.local.get('scrollUp').put(true);
  }

  render() {
    const pub = Session.getPubKey();
    return html`
      <div class="application-list">
        ${iris.util.isElectron ? html`<div class="electron-padding"/>` : html`
            <br/><br/>
        `}
        <div class="visible-xs-block">
          <${Link} onClick=${() => this.menuLinkClicked()} activeClassName="active" href="/profile/${pub}">
            <span class="icon"><${Identicon} str=${pub} width=40/></span>
            <span class="text" style="font-size: 1.2em;border:0;margin-left: 7px;"><iris-text user="${pub}" path="profile/name" editable="false"/></span>
          <//>
          <br/><br/>
        </div>
        ${APPLICATIONS.map(a => {
          if (a.url) {
            return html`
              <${a.native ? 'a' : Link} onClick=${() => this.menuLinkClicked()} activeClassName="active" href=${a.url}>
                <span class="icon">
                  ${a.text === t('messages') && this.state.unseenTotal ? html`<span class="unseen unseen-total">${this.state.unseenTotal}</span>`: ''}
                  ${a.icon || Icons.circle}
                </span>
                <span class="text">${a.text}</span>
              <//>`;
          } else {
            return html`<br/><br/>`;
          }
        })}
      </div>
    `;
  }
}

class Main extends Component {
  componentDidMount() {
    State.local.get('loggedIn').on(loggedIn => this.setState({loggedIn}));
    State.local.get('toggleMenu').put(false);
    State.local.get('toggleMenu').on(show => this.toggleMenu(show));
    State.electron && State.electron.get('platform').on(platform => this.setState({platform}));
  }

  handleRoute(e) {
    let activeRoute = e.url;
    if (!activeRoute && window.location.hash) {
      return route(window.location.hash.replace('#', '')); // bubblegum fix back navigation
    }
    document.title = 'IXNAY';
    if (activeRoute && activeRoute.length > 1) { document.title += ' - ' + Helpers.capitalize(activeRoute.replace('/', '')); }
    State.local.get('activeRoute').put(activeRoute);
    QRScanner.cleanupScanner();
  }

  onClickOverlay() {
    if (this.state.showMenu) {
      this.setState({showMenu: false});
    }
  }

  toggleMenu(show) {
    this.setState({showMenu: typeof show === 'undefined' ? !this.state.showMenu : show});
  }

  electronCmd(name) {
    State.electron.get('cmd').put({name, time: new Date().toISOString()});
  }

  render() {
    let content = '';
    const isDesktopNonMac = this.state.platform && this.state.platform !== 'darwin';
    if (this.state.loggedIn || window.location.hash.length <= 2) {
      content = this.state.loggedIn ? html`
        ${isDesktopNonMac ? html`
          <div class="windows-titlebar">
               <img src="img/iris_logotype.png" height=16 width=28 />
               <div class="title-bar-btns">
                    <button class="min-btn" onClick=${() => this.electronCmd('minimize')}>-</button>
                    <button class="max-btn" onClick=${() => this.electronCmd('maximize')}>+</button>
                    <button class="close-btn" onClick=${() => this.electronCmd('close')}>x</button>
               </div>
          </div>
        ` : ''}
        <section class="main ${isDesktopNonMac ? 'desktop-non-mac' : ''} ${this.state.showMenu ? 'menu-visible-xs' : ''}" style="flex-direction: row;">
          <${Menu}/>
          <div class="overlay" onClick=${e => this.onClickOverlay(e)}></div>
          <div class="view-area">
            <${Router} history=${createHashHistory()} onChange=${e => this.handleRoute(e)}>
              <${Home} path="/"/>
              <${Login} path="/login"/>
              <${Torrent} path="/torrent/:id"/>
              <${Settings} path="/settings"/>
              <${LogoutConfirmation} path="/logout"/>
              <${Store} path="/store/:store?"/>
              <${Product} path="/product/:product/:store"/>
              <${Product} path="/product/new" store=Session.getPubKey()/>
              <${Explorer} path="/explorer/:node"/>
              <${Explorer} path="/explorer"/>
            </${Router}>
          </div>
        </section>
        <${MediaPlayer}/>
        <${Footer}/>
        <${VideoCall}/>
      ` : html`<${Login}/>`;
    }
    return html`
      <div id="main-content">
        ${content}
      </div>
    `;
  }
}

render(html`<${Main}/>`, document.body);

document.body.style = 'opacity:1';

Helpers.showConsoleWarning();
