import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import bindAll from 'lodash.bindall';
import ReactTooltip from 'react-tooltip';
import ReactDOM from 'react-dom';
import {keyGenerators} from '../../lib/unique-key.js';

import styles from './action-menu.css';

const CLOSE_DELAY = 300; // ms
const HOVER_PAD = 8; // px of forgiveness around each hit-rect

// Check if a point is inside a rect (with optional padding).
const pointInRect = (x, y, rect, pad = 0) =>
    x >= rect.left - pad && x <= rect.right + pad &&
    y >= rect.top - pad && y <= rect.bottom + pad;

class ActionMenu extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'clickDelayer',
            'handleMouseMove',
            'handleOpenMenu',
            'handleTouchStart',
            'handleTouchOutside',
            'setButtonRef',
            'setContainerRef',
            'setMoreButtonsRef'
        ]);
        this.state = {
            isOpen: false,
            forceHide: false,
            fixedStyle: null
        };
        this.mainTooltipId = `tooltip-${Math.random()}`;
        this.portalRef = null;
        this.closeTimeoutId = null;
    }
    componentDidMount () {
        this.buttonRef.addEventListener('touchstart', this.handleTouchStart);
        document.addEventListener('touchstart', this.handleTouchOutside);
    }
    shouldComponentUpdate (newProps, newState) {
        return newState.isOpen !== this.state.isOpen ||
            newState.forceHide !== this.state.forceHide ||
            newState.fixedStyle !== this.state.fixedStyle ||
            newProps.title !== this.props.title;
    }
    componentWillUnmount () {
        this.buttonRef.removeEventListener('touchstart', this.handleTouchStart);
        document.removeEventListener('touchstart', this.handleTouchOutside);
        document.removeEventListener('mousemove', this.handleMouseMove);
        if (this.closeTimeoutId) {
            clearTimeout(this.closeTimeoutId);
        }
    }
    /**
     * Cursor tracker — runs on every mousemove while the menu is open.
     * Closes the menu only when the cursor has been outside BOTH the
     * button container AND the portal menu for CLOSE_DELAY ms.
     */
    handleMouseMove (e) {
        if (!this.state.isOpen) return;

        const x = e.clientX;
        const y = e.clientY;

        // Check both rects individually with a few px of padding
        // to tolerate sub-pixel gaps / rounding.
        const containerRect = this.containerRef &&
            this.containerRef.getBoundingClientRect();
        const portalRect = this.portalRef &&
            this.portalRef.getBoundingClientRect();

        let inZone = false;
        if (containerRect && pointInRect(x, y, containerRect, HOVER_PAD)) {
            inZone = true;
        }
        if (portalRect && pointInRect(x, y, portalRect, HOVER_PAD)) {
            inZone = true;
        }

        // Also treat the vertical gap between portal and container as
        // "in zone" so the cursor can travel between them freely.
        if (!inZone && containerRect && portalRect) {
            const minLeft = Math.min(containerRect.left, portalRect.left) - HOVER_PAD;
            const maxRight = Math.max(containerRect.right, portalRect.right) + HOVER_PAD;
            const minTop = Math.min(containerRect.top, portalRect.top) - HOVER_PAD;
            const maxBottom = Math.max(containerRect.bottom, portalRect.bottom) + HOVER_PAD;
            if (x >= minLeft && x <= maxRight && y >= minTop && y <= maxBottom) {
                inZone = true;
            }
        }

        if (inZone) {
            if (this.closeTimeoutId) {
                clearTimeout(this.closeTimeoutId);
                this.closeTimeoutId = null;
            }
        } else if (!this.closeTimeoutId) {
            this.closeTimeoutId = setTimeout(() => {
                this.closeTimeoutId = null;
                // Final safety: check :hover before closing
                const overContainer = this.containerRef &&
                    this.containerRef.matches(':hover');
                const overPortal = this.portalRef &&
                    this.portalRef.matches(':hover');
                if (!overContainer && !overPortal) {
                    this.setState({isOpen: false, fixedStyle: null});
                    document.removeEventListener('mousemove', this.handleMouseMove);
                }
            }, CLOSE_DELAY);
        }
    }
    handleOpenMenu () {
        // Cancel any pending close
        if (this.closeTimeoutId) {
            clearTimeout(this.closeTimeoutId);
            this.closeTimeoutId = null;
        }

        // Reuse existing fixedStyle if available (avoids new object →
        // shouldComponentUpdate sees the same reference → no extra render).
        let {fixedStyle} = this.state;
        if (!fixedStyle && this.moreButtonsRef) {
            const rect = this.moreButtonsRef.getBoundingClientRect();
            fixedStyle = {
                position: 'fixed',
                bottom: `${window.innerHeight - rect.bottom}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                top: 'auto',
                margin: 0,
                zIndex: 45
            };
        }

        // Always call setState — if isOpen is already true and fixedStyle
        // is the same reference, shouldComponentUpdate returns false (no-op).
        // If a batched close is pending, this overrides it.
        this.setState({isOpen: true, forceHide: false, fixedStyle});

        // Always ensure the mousemove listener is active
        // (addEventListener with the same ref is idempotent).
        document.addEventListener('mousemove', this.handleMouseMove);
    }
    handleTouchOutside (e) {
        if (this.state.isOpen &&
            !this.containerRef.contains(e.target) &&
            !(this.portalRef && this.portalRef.contains(e.target))) {
            this.setState({isOpen: false, fixedStyle: null});
            document.removeEventListener('mousemove', this.handleMouseMove);
            if (this.closeTimeoutId) {
                clearTimeout(this.closeTimeoutId);
                this.closeTimeoutId = null;
            }
            ReactTooltip.hide();
        }
    }
    clickDelayer (fn) {
        return event => {
            ReactTooltip.hide();
            if (fn) fn(event);
            this.buttonRef.blur();
            document.removeEventListener('mousemove', this.handleMouseMove);
            if (this.closeTimeoutId) {
                clearTimeout(this.closeTimeoutId);
                this.closeTimeoutId = null;
            }
            this.setState({forceHide: true, isOpen: false, fixedStyle: null}, () => {
                setTimeout(() => this.setState({forceHide: false}));
            });
        };
    }
    handleTouchStart (e) {
        if (!this.state.isOpen) {
            e.preventDefault();
            this.handleOpenMenu();
        }
    }
    setButtonRef (ref) {
        this.buttonRef = ref;
    }
    setContainerRef (ref) {
        this.containerRef = ref;
    }
    setMoreButtonsRef (ref) {
        this.moreButtonsRef = ref;
    }
    render () {
        const {
            className,
            img: mainImg,
            title: mainTitle,
            moreButtons,
            tooltipPlace,
            onClick
        } = this.props;

        const usePortal = this.state.isOpen && !this.state.forceHide && this.state.fixedStyle;

        const menuItems = (moreButtons || []).map((buttonProps, keyId) => {
            const {img, title, onClick: handleClick,
                fileAccept, fileChange, fileInput, fileMultiple} = buttonProps;
            const isComingSoon = !handleClick;
            const hasFileInput = fileInput;
            const tooltipId = `${this.mainTooltipId}-${title}`;
            return (
                <li key={keyGenerators.actionButton(buttonProps, keyId, this.mainTooltipId)}>
                    <button
                        aria-label={title}
                        className={classNames(styles.button, styles.moreButton, {
                            [styles.comingSoon]: isComingSoon
                        })}
                        data-for={tooltipId}
                        data-tip={title}
                        onClick={hasFileInput ? handleClick : this.clickDelayer(handleClick)}
                    >
                        <img
                            className={styles.moreIcon}
                            draggable={false}
                            src={img}
                        />
                        {hasFileInput ? (
                            <input
                                accept={fileAccept}
                                className={styles.fileInput}
                                multiple={fileMultiple}
                                ref={fileInput}
                                type="file"
                                onChange={fileChange}
                            />) : null}
                    </button>
                    <ReactTooltip
                        className={classNames(styles.tooltip, {
                            [styles.comingSoonTooltip]: isComingSoon
                        })}
                        effect="solid"
                        id={tooltipId}
                        place={tooltipPlace || 'left'}
                        arrowColor="var(--tooltip-arrow-color)"
                    />
                </li>
            );
        });

        return (
            <div
                className={classNames(styles.menuContainer, className, {
                    [styles.expanded]: this.state.isOpen,
                    [styles.forceHidden]: this.state.forceHide
                })}
                ref={this.setContainerRef}
                onMouseEnter={this.handleOpenMenu}
            >
                <button
                    aria-label={mainTitle}
                    className={classNames(styles.button, styles.mainButton)}
                    data-for={this.mainTooltipId}
                    data-tip={mainTitle}
                    ref={this.setButtonRef}
                    onClick={this.clickDelayer(onClick)}
                >
                    <img
                        className={styles.mainIcon}
                        draggable={false}
                        src={mainImg}
                    />
                </button>
                <ReactTooltip
                    className={styles.tooltip}
                    effect="solid"
                    id={this.mainTooltipId}
                    place={tooltipPlace || 'left'}
                    arrowColor="var(--tooltip-arrow-color)"
                />
                {/* Always in DOM for measurement via getBoundingClientRect */}
                <div
                    className={styles.moreButtonsOuter}
                    ref={this.setMoreButtonsRef}
                    style={usePortal ? {visibility: 'hidden', pointerEvents: 'none'} : undefined}
                >
                    {!usePortal && (
                        <ul className={styles.moreButtons}>
                            {menuItems}
                        </ul>
                    )}
                </div>
                {usePortal && ReactDOM.createPortal(
                    <div
                        className={styles.moreButtonsOuter}
                        ref={el => { this.portalRef = el; }}
                        style={{
                            ...this.state.fixedStyle,
                            overflow: 'visible'
                        }}
                    >
                        <ul
                            className={styles.moreButtons}
                            style={{
                                maxHeight: '1000px',
                                overflow: 'visible',
                                transition: 'none'
                            }}
                        >
                            {menuItems}
                        </ul>
                    </div>,
                    document.body
                )}
            </div>
        );
    }
}

ActionMenu.propTypes = {
    className: PropTypes.string,
    img: PropTypes.string,
    moreButtons: PropTypes.arrayOf(PropTypes.shape({
        img: PropTypes.string,
        title: PropTypes.node.isRequired,
        onClick: PropTypes.func,
        fileAccept: PropTypes.string,
        fileChange: PropTypes.func,
        fileInput: PropTypes.func,
        fileMultiple: PropTypes.bool
    })),
    onClick: PropTypes.func.isRequired,
    title: PropTypes.node.isRequired,
    tooltipPlace: PropTypes.string
};

export default ActionMenu;
