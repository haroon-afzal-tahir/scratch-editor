import React, {useState, useCallback, useEffect} from 'react';
import {defineMessages, FormattedMessage} from 'react-intl';
import PropTypes from 'prop-types';
import ReactModal from 'react-modal';
import classNames from 'classnames';
import {sections} from './sections/sections';
import GA4 from '../../lib/analytics';

import styles from './debug-modal.css';
import debugIcon from './icons/icon--debug.svg';
import debugIconInverted from './icons/icon--debug-inverted.svg';
import closeIcon from './icons/icon--close.svg';
import prevIcon from './icons/icon--prev.svg';
import nextIcon from './icons/icon--next.svg';

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
 * Generate a consistent key for a debug section based on its properties
 * @param {object} section - The section object
 * @param {number} index - The index in the sections array
 * @returns {string} - A consistent, unique key
 */
const generateSectionKey = (section, index) => {
    const parts = [`idx-${index}`];

    if (section.id) parts.push(`id-${section.id}`);
    if (section.title?.id) parts.push(`title-${section.title.id}`);
    if (section.image) parts.push(`img-${section.image.slice(-20)}`);

    return `section-${hashString(parts.join('|'))}`;
};

const messages = defineMessages({
    title: {
        id: 'gui.debugModal.title',
        defaultMessage: 'Debugging | Getting Unstuck',
        description: 'title for the debugging modal'
    }
});

const logTopicChange = topicIndex => {
    GA4.event({
        category: 'change_topic_debug_modal',
        label: sections[topicIndex].id
    });
};

const DebugModal = ({isOpen, onClose = () => {}}) => {
    const [selectedTopicIndex, setSelectedTopicIndex] = useState(0);

    // Preload images
    useEffect(() => {
        sections.forEach(section => {
            new Image().src = section.image;
        });
    }, []);

    const handleNext = useCallback(() => {
        if (selectedTopicIndex < sections.length - 1) {
            setSelectedTopicIndex(selectedTopicIndex + 1);
            logTopicChange(selectedTopicIndex + 1);
        }
    }, [selectedTopicIndex, setSelectedTopicIndex]);

    const handlePrevious = useCallback(() => {
        if (selectedTopicIndex > 0) {
            setSelectedTopicIndex(selectedTopicIndex - 1);
            logTopicChange(selectedTopicIndex - 1);
        }
    }, [selectedTopicIndex, setSelectedTopicIndex]);

    const handleTopicSelect = useCallback(index => {
        setSelectedTopicIndex(index);
        logTopicChange(index);
    }, [setSelectedTopicIndex]);

    const handleClose = useCallback(() => {
        GA4.event({
            category: 'close_debug_modal'
        });
        onClose();
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            GA4.event({
                category: 'open_debug_modal',
                label: sections[selectedTopicIndex].id
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <ReactModal
            isOpen={isOpen}
            onRequestClose={handleClose}
            className={styles.debugModalContainer}
            overlayClassName={styles.debugModalOverlay}
        >
            <div className={styles.modalHeader}>
                <div className={styles.headerTitle}>
                    <img
                        className={styles.debugIcon}
                        src={debugIcon}
                    />
                    <FormattedMessage
                        {...messages.title}
                    />
                </div>
                <button
                    className={styles.closeButton}
                    onClick={handleClose}
                >
                    <img
                        className={styles.closeIcon}
                        src={closeIcon}
                    />
                </button>
            </div>
            <div className={styles.modalContent} >
                <div className={styles.topicList}>
                    {sections.map((section, index) => (
                        <div
                            key={generateSectionKey(section, index)}
                            className={classNames(styles.topicItem, {
                                [styles.active]: selectedTopicIndex === index
                            })}
                            // eslint-disable-next-line react/jsx-no-bind
                            onClick={() => handleTopicSelect(index)}
                        >
                            <div className={styles.debugIcon}>
                                <img
                                    className={classNames({
                                        [styles.hidden]: selectedTopicIndex !== index
                                    })}
                                    src={debugIconInverted}
                                />
                            </div>
                            <FormattedMessage
                                {...(section.sectionTitle ?? section.title)}
                            />
                        </div>
                    ))}
                </div>
                <div className={styles.infoContainer}>
                    <div className={styles.textContainer}>
                        <div className={styles.titleText}>
                            <FormattedMessage
                                {...sections[selectedTopicIndex].title}
                            />
                        </div>
                        <div className={styles.description}>{sections[selectedTopicIndex].description}</div>
                    </div>
                    <div className={styles.imageContainer}>
                        <img
                            src={sections[selectedTopicIndex].image}
                            className={styles.topicImage}
                        />
                    </div>
                    <div className={styles.navigationButtons}>
                        <img
                            src={prevIcon}
                            alt="Previous"
                            onClick={handlePrevious}
                            className={classNames(styles.previousIcon, {
                                [styles.hidden]: selectedTopicIndex === 0
                            })}
                        />
                        <img
                            src={nextIcon}
                            alt="Next"
                            onClick={handleNext}
                            className={classNames(styles.nextIcon, {
                                [styles.hidden]: selectedTopicIndex === sections.length - 1
                            })}
                        />
                    </div>
                </div>
            </div>
        </ReactModal>
    );
};

DebugModal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func
};

export default DebugModal;
