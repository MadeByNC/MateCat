/**
 * React Component for the editarea.

 */
import React from 'react';
import PropTypes from 'prop-types';
import VirtualList from 'react-tiny-virtual-list';
import SegmentStore from '../../stores/SegmentStore';
import CommentsStore from '../../stores/CommentsStore';
import CatToolStore from '../../stores/CatToolStore';
import Segment from './Segment';
import SegmentConstants from '../../constants/SegmentConstants';
import CatToolConstants from '../../constants/CatToolConstants';
import Speech2Text from '../../utils/speech2text';
import TagUtils from '../../utils/tagUtils';
import Immutable from 'immutable';


class SegmentsContainer extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            segments : Immutable.fromJS([]),
            splitGroup: [],
            timeToEdit: config.time_to_edit_enabled,
            scrollTo: this.props.startSegmentId,
            scrollToSelected: false,
            window: {
                width: 0,
                height: 0,
            },
            sideOpen: false,
            files: CatToolStore.getJobFilesInfo()
        };
        this.renderSegments = this.renderSegments.bind(this);
        this.updateAllSegments = this.updateAllSegments.bind(this);
        this.splitSegments = this.splitSegments.bind(this);
        this.updateWindowDimensions = this.updateWindowDimensions.bind(this);
        this.scrollToSegment = this.scrollToSegment.bind(this);
        this.scrollToSelectedSegment = this.scrollToSelectedSegment.bind(this);
        this.openSide = this.openSide.bind(this);
        this.closeSide = this.closeSide.bind(this);
        this.recomputeListSize = this.recomputeListSize.bind(this);
        this.forceUpdateSegments = this.forceUpdateSegments.bind(this);
        this.storeJobInfo = this.storeJobInfo.bind(this);

        this.lastScrollTop = 0;
        this.segmentsHeightsMap = {};
        this.segmentsWithCollectionType = [];

        this.scrollContainer;
        this.segmentContainerVisible = false;
        this.index = this.props.startSegmentId;
    }

    splitSegments(segments, splitGroup) {
        this.setState({
            segments: segments,
            splitGroup: splitGroup
        });
    }

    openSide() {
        this.segmentsHeightsMap = {};
        this.setState({sideOpen: true});
    }

    closeSide() {
        this.segmentsHeightsMap = {};
        this.setState({sideOpen: false});
    }

    updateAllSegments() {
        this.forceUpdate();
    }

    renderSegments(segments) {
        // VirtualList.prototype.animateScroll = false;
        let splitGroup =  [];
        this.setState({
            segments: segments,
            splitGroup: splitGroup,
            timeToEdit: config.time_to_edit_enabled,
        });
    }

    setLastSelectedSegment(sid) {
        this.lastSelectedSegment = {
            sid: sid
        };
    }

    setBulkSelection(sid, fid) {
        if ( _.isUndefined(this.lastSelectedSegment) ) {
            this.lastSelectedSegment = {
                sid: sid
            };
        }
        let from = Math.min(sid, this.lastSelectedSegment.sid);
        let to = Math.max(sid, this.lastSelectedSegment.sid);
        this.lastSelectedSegment = {
            sid: sid
        };
        SegmentActions.setBulkSelectionInterval(from, to, fid);
    }

    scrollToSegment(sid) {
        this.lastScrolled = sid;
        this.setState({scrollTo: sid, scrollToSelected: false});
        setTimeout(()=>this.onScroll(), 500);
    }

    scrollToSelectedSegment(sid) {
        this.setState({scrollTo: sid, scrollToSelected: true});
        setTimeout(()=>this.onScroll(), 500);
    }

    getIndexToScroll() {
        let position = (this.state.scrollToSelected) ? 'auto' : 'start';
        if ( this.state.scrollTo && this.state.segments.size > 0 ) {
            const index = this.state.segments.findIndex( (segment, index) => {
                if (this.state.scrollTo.toString().indexOf("-") === -1) {
                    return parseInt(segment.get('sid')) === parseInt(this.state.scrollTo);
                } else {
                    return segment.get('sid') === this.state.scrollTo;
                }
            });

            let scrollTo;
            if ( this.state.scrollToSelected) {
                scrollTo = ( this.state.scrollTo < this.lastScrolled ) ? index - 1  : index + 1;
                scrollTo = ( index > this.state.segments.size - 2 || index === 0 ) ? index : scrollTo;
                this.lastScrolled = this.state.scrollTo;
                return { scrollTo: scrollTo, position: position }
            }
            scrollTo = ( index >= 2 ) ? index-2 : ( index === 0 ) ? 0 : index-1 ;
            scrollTo = ( index > this.state.segments.size - 8 ) ? index : scrollTo;
            if ( scrollTo > 0 || scrollTo < this.state.segments.size - 8 ) { //if the opened segments is too big for the view dont show the previous
                let scrollToHeight = this.getSegmentHeight(index);
                let segmentBefore1 = this.getSegmentHeight(index-1);
                let segmentBefore2 = this.getSegmentHeight(index-2);
                let totalHeight = segmentBefore1 + segmentBefore2 + scrollToHeight;
                if ( totalHeight > this.state.window.height - 50 ) {
                    if ( scrollToHeight + segmentBefore1 < this.state.window.height + 50 ) {
                        return { scrollTo: index - 1, position: position }
                    }
                    return { scrollTo: index, position: position }
                }

            }
            return { scrollTo: scrollTo, position: position }
        } else if ( this.lastListSize < this.state.segments.size && this.scrollDirectionTop) {
            const diff = this.state.segments.size - this.lastListSize;
            return { scrollTo: this.lastUpdateObj.startIndex + diff, position: position }
        }
        return { scrollTo: null, position: null }
    }

    getSegmentByIndex(index) {
        return this.state.segments.get(index);
    }

    getCollectionType ( segment ) {
        let collectionType;
        if (segment.notes) {
            segment.notes.forEach(function (item, index) {
                if ( item.note && item.note !== "" ) {
                    if (item.note.indexOf("Collection Name: ") !== -1) {
                        let split = item.note.split(": ");
                        if ( split.length > 1) {
                            collectionType = split[1];
                        }
                    }
                }
            });
        }
        return collectionType;
    }

    getSegment(segment, segImmutable, currentFileId, collectionTypeSeparator) {
        let isReviewExtended = !!(this.props.isReviewExtended);

        let segmentHeight = (!segment.opened && this.segmentsHeightsMap[segment.sid]) ? this.segmentsHeightsMap[segment.sid].height : this.lastOpenedHeight;

        let item = <Segment
            key={segment.sid}
            segment={segment}
            segImmutable={segImmutable}
            timeToEdit={this.state.timeToEdit}
            fid={this.props.fid}
            isReview={this.props.isReview}
            isReviewExtended={isReviewExtended}
            reviewType={this.props.reviewType}
            enableTagProjection={this.props.enableTagProjection}
            decodeTextFn={TagUtils.decodeText}
            tagLockEnabled={this.state.tagLockEnabled}
            tagModesEnabled={this.props.tagModesEnabled}
            speech2textEnabledFn={Speech2Text.enabled}
            setLastSelectedSegment={this.setLastSelectedSegment.bind(this)}
            setBulkSelection={this.setBulkSelection.bind(this)}
            sideOpen={this.state.sideOpen}
            files={this.state.files}
            height={segmentHeight}
        />;
        if ( segment.id_file !== currentFileId ) {
            let file = (!!this.state.files)? _.find(this.state.files, (file) => file.id == segment.id_file): false;
            let classes = (this.state.sideOpen) ? 'slide-right' : '';
            return <React.Fragment>
                <ul className={"projectbar " + classes} data-job={"job-"+ segment.id_file}>
                    <li className="filename">
                        <h2 title={segment.filename}>{segment.filename}</h2>
                    </li>
                    <li style={{textAlign:'center', textIndent:'-20px'}}>
                        <strong/> [<span className="source-lang">{config.source_rfc}</span>] >
                        <strong/> [<span className="target-lang">{config.target_rfc}</span>]
                    </li>
                    { file ? (
                        <li className="wordcounter">Payable Words: <strong>{file.weighted_words}</strong>
                        </li>
                    ):null}

                </ul>
                {collectionTypeSeparator}
                {item}
            </React.Fragment>
        }
        return <React.Fragment>
                {collectionTypeSeparator}
                {item}
                </React.Fragment>;
    }

    getSegments() {
        let items = [];
        let currentFileId = 0;
        let collectionsTypeArray = [];
        this.state.segments.forEach( (segImmutable) =>{
            let segment = segImmutable.toJS();
            let collectionType = this.getCollectionType(segment);
            let collectionTypeSeparator;
            if (collectionType && collectionsTypeArray.indexOf(collectionType) === -1) {
                let classes = (this.state.sideOpen) ? 'slide-right' : '';
                collectionTypeSeparator = <div className={"collection-type-separator " + classes} key={collectionType+segment.sid+ (Math.random()*10)}>
                    Collection Name: <b>{collectionType}</b></div>;
                collectionsTypeArray.push(collectionType);
                if ( this.segmentsWithCollectionType.indexOf(segment.sid) === -1 ) {
                    this.segmentsWithCollectionType.push(segment.sid);
                }
            }
            let item = this.getSegment(segment, segImmutable, currentFileId, collectionTypeSeparator);
            currentFileId = segment.id_file;
        items.push(item);
        });
        return items;
    }

    getCommentsPadding(index, segment) {
        if ( index === 0 ) {
            let segment1 = this.getSegmentByIndex(1);
            let segment2 = this.getSegmentByIndex(2);

            if ( segment.get('openComments') ) {
                let comments = CommentsStore.getCommentsBySegment(segment.get('original_sid'));
                if (index === 0 && comments.length === 0)
                    return 110;
                else  if (index === 0 && comments.length > 0)
                    return 270;
            } else if ( segment1 && segment1.get('openComments') ) {
                let comments = CommentsStore.getCommentsBySegment(segment1.get('original_sid'));
                if (comments.length === 0)
                    return 100;
                else  if (comments.length > 0)
                    return 150;
            } else if ( segment2 && segment2.get('openComments') ) {
                let comments = CommentsStore.getCommentsBySegment(segment2.get('original_sid'));
                if (comments.length > 0)
                    return 100;
            }
        }
        return 0;
    }

    getSegmentHeight(index) {
        if ( !this.segmentContainerVisible ) {
            $('#hiddenHtml section').css('display', 'block');
        }
        let segment = this.getSegmentByIndex(index);
        if ( !segment ) {
            return 0;
        }
        let previousFileId = (index === 0) ? 0 : this.getSegmentByIndex(index-1).get('id_file');

        let calculatedHeight = this.segmentsHeightsMap[segment.get('sid')];

        if ( calculatedHeight && calculatedHeight.height > 0 &&  calculatedHeight.segment.equals(segment)) {
            let heightToAdd = 0;
            if ( previousFileId !== segment.get('id_file')) {
                heightToAdd = 43;
            }
            if ( index === this.state.segments.size - 1) {
                heightToAdd = heightToAdd + 150;
            }
            return calculatedHeight.height + heightToAdd ;
        }

        let itemHeight = 0;
        let commentsPadding = this.getCommentsPadding(index, segment);
        if (segment.get('opened')) {
            let $segment= $('#segment-' + segment.get('sid'));
            if ( ($segment.length && $segment.hasClass('opened')) || ($segment.length === 0 && this.lastOpenedHeight) ) {
                itemHeight = ($segment.length) ? $segment.outerHeight() + 20 :  this.lastOpenedHeight;
                itemHeight = itemHeight - 23; //Add private resources div
                this.lastOpenedHeight = itemHeight
            }
        }
        if (itemHeight === 0) {
            if ( this.state.sideOpen ) {
                $('#hiddenHtml section').addClass('slide-right');
            } else {
                $('#hiddenHtml section').removeClass('slide-right');
            }
            let source = $('#hiddenHtml .source');
            source.html(segment.get('decoded_source'));
            const sourceHeight = source.outerHeight();


            let target = $('#hiddenHtml .targetarea');
            target.html(segment.get('decoded_translation'));
            const targetHeight = target.closest('.target').outerHeight();

            source.html('');
            target.html('');
            itemHeight = Math.max(sourceHeight + 12, targetHeight + 12, 89) ;
        }

        //Collection type
        if (this.segmentsWithCollectionType.indexOf(segment.get('sid')) !== -1) {
            itemHeight = itemHeight + 42;
        }
        let height = itemHeight + commentsPadding;

        if ( !segment.get('opened') ) {
            this.segmentsHeightsMap[segment.get('sid')] = {
                segment : segment,
                height : height
            };
        }

        //If is the first segment of a file add the file header
        if ( previousFileId !== segment.get('id_file')) {
            height = height + 43;
        }

        if ( index === this.state.segments.size - 1) {
            height = height + 150;
        }

        return height;
    }

    onScroll() {
        let scrollTop = this.scrollContainer.scrollTop();
        let scrollBottom = this.scrollContainer.prop('scrollHeight') - (scrollTop + this.scrollContainer.height());
        this.scrollDirectionTop = (scrollTop < this.lastScrollTop);
        if ( scrollBottom < 700 && !this.scrollDirectionTop) {
            UI.getMoreSegments('after');
        } else if( scrollTop < 500 && this.scrollDirectionTop) {
            UI.getMoreSegments('before');
        }
        this.lastListSize = this.state.segments.size;
        this.lastScrollTop = scrollTop;
    }

    recomputeListSize(idFrom) {
        const index = this.state.segments.findIndex( (segment, index) => {
            return segment.get('sid') === idFrom;
        });
        this.listRef.recomputeSizes(index);
        (this.segmentsHeightsMap[idFrom]) ? this.segmentsHeightsMap[idFrom].height = 0 : null;
        this.forceUpdate();
    }

    forceUpdateSegments(segments) {
        this.setState({
            segments: segments,
            splitGroup: splitGroup
        });
        this.forceUpdate();
    }

    storeJobInfo(files) {
        this.setState({
            files: files
        })
    }

    componentDidMount() {
        this.updateWindowDimensions();
        this.scrollContainer = $(".article-segments-container > div");
        window.addEventListener('resize', this.updateWindowDimensions);
        SegmentStore.addListener(SegmentConstants.RENDER_SEGMENTS, this.renderSegments);
        SegmentStore.addListener(SegmentConstants.SPLIT_SEGMENT, this.splitSegments);
        SegmentStore.addListener(SegmentConstants.UPDATE_ALL_SEGMENTS, this.updateAllSegments);
        SegmentStore.addListener(SegmentConstants.SCROLL_TO_SEGMENT, this.scrollToSegment);
        SegmentStore.addListener(SegmentConstants.SCROLL_TO_SELECTED_SEGMENT, this.scrollToSelectedSegment);
        SegmentStore.addListener(SegmentConstants.OPEN_SIDE, this.openSide);
        SegmentStore.addListener(SegmentConstants.CLOSE_SIDE, this.closeSide);

        SegmentStore.addListener(SegmentConstants.RECOMPUTE_SIZE, this.recomputeListSize);
        SegmentStore.addListener(SegmentConstants.FORCE_UPDATE, this.forceUpdateSegments);
        CatToolStore.addListener(CatToolConstants.STORE_FILES_INFO, this.storeJobInfo);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.updateWindowDimensions);
        SegmentStore.removeListener(SegmentConstants.RENDER_SEGMENTS, this.renderSegments);
        SegmentStore.removeListener(SegmentConstants.SPLIT_SEGMENT, this.splitSegments);
        SegmentStore.removeListener(SegmentConstants.UPDATE_ALL_SEGMENTS, this.updateAllSegments);
        SegmentStore.removeListener(SegmentConstants.SCROLL_TO_SEGMENT, this.scrollToSegment);
        SegmentStore.removeListener(SegmentConstants.SCROLL_TO_SELECTED_SEGMENT, this.scrollToSelectedSegment);
        SegmentStore.removeListener(SegmentConstants.OPEN_SIDE, this.openSide);
        SegmentStore.removeListener(SegmentConstants.CLOSE_SIDE, this.closeSide);

        SegmentStore.removeListener(SegmentConstants.RECOMPUTE_SIZE, this.recomputeListSize);
        SegmentStore.addListener(SegmentConstants.FORCE_UPDATE, this.forceUpdateSegments);

        CatToolStore.removeListener(CatToolConstants.STORE_FILES_INFO, this.storeJobInfo);

    }

    shouldComponentUpdate(nextProps, nextState) {
        return (!nextState.segments.equals(this.state.segments) ||
        nextState.splitGroup !== this.state.splitGroup ||
        nextState.tagLockEnabled !== this.state.tagLockEnabled ||
        nextState.window !== this.state.window ||
            (nextState.scrollTo && nextState.scrollTo !== this.state.scrollTo ) ||
        nextState.sideOpen !== this.state.sideOpen )
    }

    updateWindowDimensions()  {
        this.segmentsHeightsMap = {};

        let data = {};
        data.width = window.innerWidth;
        data.height = window.innerHeight - $('header').innerHeight() - $('footer').innerHeight();

        this.setState({
            window: data
        })
    };

    componentDidCatch(e){
        console.log("React component Error", e);
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        this.lastListSize = this.state.segments.size;
        if ( this.state.scrollTo !== null && this.state.segments.size > 0 ) {
            setTimeout(()=>{
                this.setState({
                    scrollTo: null,
                    scrollToSelected: false
                });
            });

        }
        this.segmentContainerVisible = false;
        $('#hiddenHtml section').css('display', 'none');
    }

    render() {
        let scrollToObject = this.getIndexToScroll();
        let items = this.getSegments();
        let width = this.state.window.width;
        return <VirtualList
            ref={(list)=>this.listRef=list}
            width={width}
            height={this.state.window.height}
            style={{overflowX: 'hidden'}}
            estimatedItemSize={80}
            overscanCount={10}
            itemCount={items.length}
            itemSize={(index)=>this.getSegmentHeight(index)}
            scrollToAlignment={scrollToObject.position}
            scrollToIndex={scrollToObject.scrollTo}
            // scrollOffset={1000}
            onScroll={(number, event) => this.onScroll() }
            renderItem={({index, style}) => {
                let styleCopy = Object.assign({}, style);
                if ( index === 0 ) {
                    let segment = this.getSegmentByIndex(index);
                    let segment1 = this.getSegmentByIndex(1);
                    let segment2 = this.getSegmentByIndex(2);

                    if ( segment.get('openComments') ) {
                        let comments = CommentsStore.getCommentsBySegment(segment.get('original_sid'));
                        if (index === 0 && comments.length === 0)
                            styleCopy.marginTop = '110px';
                        else  if (index === 0 && comments.length > 0)
                            styleCopy.marginTop = '270px';
                    } else if ( segment1 && segment1.get('openComments') ) {
                        let comments = CommentsStore.getCommentsBySegment(segment1.get('original_sid'));
                        if (comments.length === 0)
                            styleCopy.marginTop = '40px';
                        else  if (comments.length > 0)
                            styleCopy.marginTop = '100px';
                    } else if ( segment2 && segment2.get('openComments') ) {
                        let comments = CommentsStore.getCommentsBySegment(segment2.get('original_sid'));
                        if (comments.length === 0)
                            styleCopy.marginTop = '20px';
                        else  if (comments.length > 0)
                            styleCopy.marginTop = '50px';
                    }
                }
                return <div className={'segment-container'} key={index} style={styleCopy}>
                    {items[index]}
                </div>;
            }}
            onItemsRendered={(obj)=> this.lastUpdateObj = obj}
        />


    }
}

// let defaultScroll = VirtualList.prototype.scrollTo;

// VirtualList.prototype.scrollTo = function (value) {
//     console.log("VirtualList.prototype.scrollTo:"  + value);
//     function scrollTo(element, direction, to, duration) {
//         if (duration <= 0) return;
//         const difference = to - element[direction];
//         const perTick = difference / duration * 5;
//         setTimeout(function () {
//             element[direction] = element[direction] + perTick;
//             if (element[direction] === to) return;
//             scrollTo(element, direction, to, duration - 5);
//         }, 5);
//     }
//     if ( VirtualList.prototype.scrollTo.animateScroll ) {
//         const scrollDirection = this.props.scrollDirection === void 0 ? 'vertical' : this.props.scrollDirection;
//         if ( scrollDirection === 'vertical' ) {
//             scrollTo( this.rootNode, 'scrollTop', value, 15 );
//         } else scrollTo( this.rootNode, 'scrollLeft', value, 15 );
//     } else {
//         defaultScroll.call(this, value);
//     }
//     VirtualList.prototype.scrollTo.animateScroll = true;
// };

SegmentsContainer.propTypes = {
    segments: PropTypes.array,
    splitGroup: PropTypes.array,
    timeToEdit: PropTypes.string
};

SegmentsContainer.defaultProps = {
    segments: [],
    splitGroup: [],
    timeToEdit: ""
};

export default SegmentsContainer ;

