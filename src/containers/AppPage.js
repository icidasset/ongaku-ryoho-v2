import pick from 'lodash/object/pick';
import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';

import Header from '../components/app/Header';
import Loader from '../components/Loader';
// import Link from '../components/Link';
import SoundPanel from '../components/app/SoundPanel';
import Tracks from '../components/app/Tracks';

import * as viewTypes from '../constants/view_types';


class AppPage extends Component {

  getPageContent() {
    if (this.props.view === viewTypes.QUEUE) {
      return (<div>TODO: Queue</div>);

    } else if (this.props.tracks.isFetching) {
      return (<Loader />);

    }

    return (<Tracks tracks={this.props.tracks} />);
  }


  render() {
    const pageContent = this.getPageContent();

    return (
      <div>
        <Header />

        <main>
          {pageContent}
        </main>

        <SoundPanel />
      </div>
    );
  }

}


AppPage.propTypes = {
  tracks: PropTypes.object.isRequired,
  view: PropTypes.string,
};


function mapStateToProps(state) {
  return pick(state, ['tracks', 'view']);
}


export default connect(mapStateToProps)(AppPage);
