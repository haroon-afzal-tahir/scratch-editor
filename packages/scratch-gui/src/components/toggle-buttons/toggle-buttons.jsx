import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import styles from './toggle-buttons.css';

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
 * Generate a consistent key for a toggle button based on its properties
 * @param {object} button - The button properties
 * @param {number} index - The index in the buttons array
 * @returns {string} - A consistent, unique key
 */
const generateToggleKey = (button, index) => {
    const parts = [`idx-${index}`];

    if (button.title) parts.push(`title-${button.title}`);
    if (button.icon) parts.push(`icon-${button.icon.slice(-20)}`);

    return `toggle-${hashString(parts.join('|'))}`;
};

const ToggleButtons = ({buttons, className, disabled}) => (
    <div
        className={classNames(
            className,
            styles.row,
            {
                [styles.disabled]: disabled
            }
        )}
    >
        {buttons.map((button, index) => (
            <button
                key={generateToggleKey(button, index)}
                className={styles.button}
                title={button.title}
                aria-label={button.title}
                aria-pressed={button.isSelected}
                onClick={button.handleClick}
                disabled={disabled}
            >
                <img
                    src={button.icon}
                    aria-hidden="true"
                    className={button.iconClassName}
                />
            </button>
        ))}
    </div>
);

ToggleButtons.propTypes = {
    buttons: PropTypes.arrayOf(PropTypes.shape({
        title: PropTypes.string.isRequired,
        handleClick: PropTypes.func.isRequired,
        icon: PropTypes.string.isRequired,
        iconClassName: PropTypes.string,
        isSelected: PropTypes.bool
    })),
    className: PropTypes.string,
    disabled: PropTypes.bool
};

ToggleButtons.defaultProps = {
    disabled: false
};

export default ToggleButtons;
