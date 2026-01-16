import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import ModalComponent from '../components/modal/modal.jsx';

class Modal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'addEventListeners',
            'removeEventListeners',
            'handlePopState',
            'pushHistory'
        ]);
        this._isMounted = false;
    }
    componentDidMount () {
        this._isMounted = true;
        this.addEventListeners();
        // Add a history event only if it's not currently for our modal. This
        // avoids polluting the history with many entries. We only need one.
        const currentModalId = typeof history !== 'undefined' && history.state && history.state.modalId;
        this.pushHistory(this.id, (currentModalId === null || currentModalId !== this.id));
    }
    componentWillUnmount () {
        this._isMounted = false;
        this.removeEventListeners();
    }
    addEventListeners () {
        if (typeof window !== 'undefined') {
            window.addEventListener('popstate', this.handlePopState);
        }
    }
    removeEventListeners () {
        if (typeof window !== 'undefined') {
            window.removeEventListener('popstate', this.handlePopState);
        }
    }
    handlePopState () {
        // Whenever someone navigates, we want to be closed
        this.props.onRequestClose();
    }
    get id () {
        return `modal-${this.props.id}`;
    }
    pushHistory (state, push) {
        // Guard against SSR where history is not available
        if (typeof history === 'undefined') return;
        // Wrap state in an object for Next.js App Router compatibility
        // Next.js expects history.state to be an object it can modify
        const stateObj = {modalId: state, __scratch_modal: true};
        if (push) return history.pushState(stateObj, '');
        history.replaceState(stateObj, '');
    }
    render () {
        return <ModalComponent {...this.props} />;
    }
}

Modal.propTypes = {
    id: PropTypes.string.isRequired,
    isRtl: PropTypes.bool,
    onRequestClose: PropTypes.func,
    onRequestOpen: PropTypes.func
};

const mapStateToProps = state => ({
    isRtl: state.locales.isRtl
});

export default connect(
    mapStateToProps
)(Modal);
