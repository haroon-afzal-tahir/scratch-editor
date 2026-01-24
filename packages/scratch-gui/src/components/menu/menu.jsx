import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './menu.css';

/**
 * Simple hash function (djb2 algorithm) to generate consistent keys from strings
 * @param {string} str - Input string to hash
 * @returns {string} - Hash string
 */
const hashString = str => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
};

/**
 * Generate a consistent key for a React child element based on its properties
 * @param {React.ReactElement} child - The child element
 * @param {number} index - The index in the children array
 * @returns {string} - A consistent, unique key
 */
const generateChildKey = (child, index) => {
    if (!child) return `empty-${index}`;

    // Build a string representation of identifying properties
    const parts = [`idx-${index}`];

    // Include element type
    if (child.type) {
        const typeName = typeof child.type === 'string'
            ? child.type
            : (child.type.displayName || child.type.name || 'Component');
        parts.push(`type-${typeName}`);
    }

    // Include key props that help identify the element
    if (child.props) {
        if (child.props.id) parts.push(`id-${child.props.id}`);
        if (child.props.name) parts.push(`name-${child.props.name}`);
        if (child.props.href) parts.push(`href-${child.props.href}`);
        if (child.props.onClick && child.props.onClick.name) {
            parts.push(`onClick-${child.props.onClick.name}`);
        }
        // For FormattedMessage components
        if (child.props.defaultMessage) {
            parts.push(`msg-${child.props.defaultMessage.slice(0, 20)}`);
        }
    }

    return `menu-${hashString(parts.join('|'))}`;
};

const MenuComponent = ({
    className = '',
    children,
    componentRef,
    place = 'right'
}) => (
    <ul
        className={classNames(
            styles.menu,
            className,
            {
                [styles.left]: place === 'left',
                [styles.right]: place === 'right'
            }
        )}
        ref={componentRef}
    >
        {children}
    </ul>
);

MenuComponent.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    componentRef: PropTypes.func,
    place: PropTypes.oneOf(['left', 'right'])
};


const Submenu = ({children, className, place, ...props}) => (
    <ul
        className={classNames(
            styles.submenu,
            className,
            {
                [styles.left]: place === 'left',
                [styles.right]: place === 'right'
            }
        )}
    >
        <MenuComponent
            place={place}
            {...props}
        >
            {children}
        </MenuComponent>
    </ul>
);

Submenu.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    place: PropTypes.oneOf(['left', 'right'])
};

const MenuItem = ({
    children,
    className,
    expanded = false,
    onClick
}) => (
    <li
        className={classNames(
            styles.menuItem,
            styles.hoverable,
            className,
            {[styles.expanded]: expanded}
        )}
        onClick={onClick}
    >
        {children}
    </li>
);

MenuItem.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    expanded: PropTypes.bool,
    onClick: PropTypes.func
};


const addDividerClassToFirstChild = (child, index) => (
    child && React.cloneElement(child, {
        className: classNames(
            child.className,
            {[styles.menuSection]: index === 0}
        ),
        key: generateChildKey(child, index)
    })
);

const MenuSection = ({children}) => (
    <React.Fragment>{
        React.Children.map(children, addDividerClassToFirstChild)
    }</React.Fragment>
);

MenuSection.propTypes = {
    children: PropTypes.node
};

export {
    MenuComponent as default,
    MenuItem,
    MenuSection,
    Submenu
};
