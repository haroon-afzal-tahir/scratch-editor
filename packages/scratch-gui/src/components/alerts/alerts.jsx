import React from 'react';
import PropTypes from 'prop-types';

import Box from '../box/box.jsx';
import Alert from '../../containers/alert.jsx';

import styles from './alerts.css';

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
 * Generate a consistent key for an alert based on its properties
 * @param {object} alert - The alert object
 * @param {number} index - The index in the alerts array
 * @returns {string} - A consistent, unique key
 */
const generateAlertKey = (alert, index) => {
    const parts = [`idx-${index}`];

    if (alert.alertId) parts.push(`id-${alert.alertId}`);
    if (alert.extensionId) parts.push(`ext-${alert.extensionId}`);
    if (alert.level) parts.push(`lvl-${alert.level}`);
    if (alert.message) {
        const msg = typeof alert.message === 'string'
            ? alert.message.slice(0, 30)
            : (alert.message.props?.id || 'msg');
        parts.push(`msg-${msg}`);
    }

    return `alert-${hashString(parts.join('|'))}`;
};

const AlertsComponent = ({
    alertsList,
    className,
    onCloseAlert
}) => (
    <Box
        bounds="parent"
        className={className}
    >
        <Box className={styles.alertsInnerContainer} >
            {alertsList.map((a, index) => (
                <Alert
                    closeButton={a.closeButton}
                    content={a.content}
                    extensionId={a.extensionId}
                    extensionName={a.extensionName}
                    iconSpinner={a.iconSpinner}
                    iconURL={a.iconURL}
                    index={index}
                    key={generateAlertKey(a, index)}
                    level={a.level}
                    message={a.message}
                    showDownload={a.showDownload}
                    showReconnect={a.showReconnect}
                    showSaveNow={a.showSaveNow}
                    onCloseAlert={onCloseAlert}
                />
            ))}
        </Box>
    </Box>
);

AlertsComponent.propTypes = {
    alertsList: PropTypes.arrayOf(PropTypes.object),
    className: PropTypes.string,
    onCloseAlert: PropTypes.func
};

export default AlertsComponent;
