import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

import Box from '../box/box.jsx';
import styles from './connection-modal.css';

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
 * Generate a consistent key for a dot based on its position and total
 * @param {number} index - The dot index
 * @param {number} total - Total number of dots
 * @returns {string} - A consistent, unique key
 */
const generateDotKey = (index, total) => {
    return `dot-${hashString(`pos-${index}-of-${total}`)}`;
};

const Dots = props => (
    <Box
        className={classNames(
            props.className,
            styles.dotsRow
        )}
    >
        <div
            className={classNames(
                styles.dotsHolder,
                {
                    [styles.dotsHolderError]: props.error,
                    [styles.dotsHolderSuccess]: props.success
                }
            )}
        >
            {Array(props.total).fill(0)
                .map((_, i) => {
                    let type = 'inactive';
                    if (props.counter === i) type = 'active';
                    if (props.success) type = 'success';
                    if (props.error) type = 'error';
                    return (<Dot
                        key={generateDotKey(i, props.total)}
                        type={type}
                    />);
                })}
        </div>
    </Box>
);

Dots.propTypes = {
    className: PropTypes.string,
    counter: PropTypes.number,
    error: PropTypes.bool,
    success: PropTypes.bool,
    total: PropTypes.number
};

const Dot = props => (
    <div
        className={classNames(
            styles.dot,
            {
                [styles.inactiveStepDot]: props.type === 'inactive',
                [styles.activeStepDot]: props.type === 'active',
                [styles.successDot]: props.type === 'success',
                [styles.errorDot]: props.type === 'error'
            }
        )}
    />
);

Dot.propTypes = {
    type: PropTypes.string
};

export default Dots;
