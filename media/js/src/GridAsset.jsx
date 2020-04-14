import React from 'react';
import PropTypes from 'prop-types';

import Map from 'ol/Map';
import View from 'ol/View';
import GeoJSON from 'ol/format/GeoJSON';
import MultiPoint from 'ol/geom/MultiPoint';
import {getCenter} from 'ol/extent';
import ImageLayer from 'ol/layer/Image';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Projection from 'ol/proj/Projection';
import Static from 'ol/source/ImageStatic';
import {
    Circle as CircleStyle, Fill, Stroke, Style
} from 'ol/style';

import AnnotationScroller from './AnnotationScroller';
import Asset from './Asset';

class MySelections extends React.Component {
    render() {
        let annotationsDom = null;
        let annotations = [];

        const me = this;
        this.props.asset.annotations.forEach(function(annotation) {
            if (annotation.author.id === me.props.currentUser) {
                annotations.push(annotation);
            }
        });

        if (annotations.length > 0) {
            annotationsDom = <React.Fragment>
                <div className="dropdown-divider"></div>
                <div className="card-body">
                    <h5 className="card-title">My Annotations</h5>
                    <AnnotationScroller
                        annotations={annotations}
                        onSelectedAnnotationUpdate={
                            this.props.onSelectedAnnotationUpdate}
                    />
                </div>
            </React.Fragment>;
        }

        return annotationsDom;
    }
}

MySelections.propTypes = {
    asset: PropTypes.object,
    onSelectedAnnotationUpdate: PropTypes.func.isRequired,
    currentUser: PropTypes.number.isRequired
};

class ClassSelections extends React.Component {
    render() {
        let annotationsDom = null;
        let annotations = [];

        const me = this;
        this.props.asset.annotations.forEach(function(annotation) {
            if (annotation.author.id !== me.props.currentUser) {
                annotations.push(annotation);
            }
        });

        if (annotations.length > 0) {
            annotationsDom = <React.Fragment>
                <div className="dropdown-divider"></div>
                <div className="card-body">
                    <h5 className="card-title">Class Annotations</h5>
                    <AnnotationScroller
                        annotations={annotations}
                        onSelectedAnnotationUpdate={
                            this.props.onSelectedAnnotationUpdate}
                    />
                </div>
            </React.Fragment>;
        }

        return annotationsDom;
    }
}

ClassSelections.propTypes = {
    asset: PropTypes.object,
    onSelectedAnnotationUpdate: PropTypes.func.isRequired,
    currentUser: PropTypes.number.isRequired
};

export default class GridAsset extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            selectedAnnotation: null
        };

        this.annotationLayer = new VectorLayer({
            source: new VectorSource()
        });

        this.asset = new Asset(this.props.asset);

        this.onSelectedAnnotationUpdate =
            this.onSelectedAnnotationUpdate.bind(this);
    }
    /**
     * Transform a relative geometry object to absolute, given a width,
     * height, and zoom.
     */
    transform(geometry, width, height, zoom) {
        return {
            type: geometry.type,
            coordinates: [
                geometry.coordinates[0].map(function(el) {
                    return [
                        (width / 2) + (el[0] * (zoom * 2)),
                        (height / 2) + (el[1] * (zoom * 2))
                    ];
                })
            ]
        };
    }
    onSelectedAnnotationUpdate(annotation) {
        const type = this.asset.getType();
        const a = this.props.asset.annotations[annotation];

        this.setState({selectedAnnotation: a});

        if (type === 'image') {
            const styles = [
                new Style({
                    stroke: new Stroke({
                        color: 'blue',
                        width: 3
                    }),
                    fill: new Fill({
                        color: 'rgba(0, 0, 255, 0.1)'
                    })
                }),
                new Style({
                    image: new CircleStyle({
                        radius: 4,
                        fill: new Fill({
                            color: 'orange'
                        })
                    }),
                    geometry: function(feature) {
                        // return the coordinates of the first ring of
                        // the polygon
                        var coordinates =
                            feature.getGeometry().getCoordinates()[0];
                        return new MultiPoint(coordinates);
                    }
                })
            ];

            this.map.removeLayer(this.annotationLayer);

            const img = this.asset.getImage();
            const geometry = this.transform(
                a.annotation.geometry,
                img.width, img.height,
                a.annotation.zoom
            );
            const geojsonObject = {
                type: 'FeatureCollection',
                crs: {
                    type: 'name',
                    properties: {
                        name: 'Flatland:1'
                    }
                },
                features: [
                    {
                        type: 'Feature',
                        geometry: geometry
                    }
                ]
            };

            const source = new VectorSource({
                features: new GeoJSON().readFeatures(geojsonObject)
            });

            const newLayer = new VectorLayer({
                source: source,
                style: styles
            });

            this.annotationLayer = newLayer;
            this.map.addLayer(newLayer);

            // Fit the selection in the view
            const feature = source.getFeatures()[0];
            const polygon = feature.getGeometry();
            const view = this.map.getView();
            view.fit(polygon, {padding: [20, 20, 20, 20]});
        }
    }
    render() {
        const type = this.asset.getType();

        let annotationDom = null;
        if (type === 'video' && this.state.selectedAnnotation) {
            annotationDom = (
                <div className="vid-timecode">
                    {this.state.selectedAnnotation.annotation.startCode}
                    &nbsp;-&nbsp;
                    {this.state.selectedAnnotation.annotation.endCode}
                </div>
            );
        }

        let assetLink = '#';
        if (window.MediaThread) {
            const courseId = window.MediaThread.current_course;
            assetLink =
                `/course/${courseId}/react/asset/${this.props.asset.id}`;
        }

        return (
            <div className="card" key={this.props.asset.id}>
                <div className="image-overlay">
                    {type === 'image' && (
                        <div
                            id={`map-${this.props.asset.id}`}
                            className="ol-map"></div>
                    )}
                    {type === 'video' && (
                        <img
                            style={{'maxWidth': '100%'}}
                            alt={'Video thumbnail for: ' +
                                 this.props.asset.title}
                            src={this.asset.getThumbnail()} />
                    )}
                    {annotationDom}
                    <span className="badge badge-secondary">{type}</span>
                </div>

                <div className="card-body">
                    <h5 className="card-title">
                        <a
                            onClick={
                                this.props.toggleAssetView.bind(
                                    this, this.props.asset)}
                            href={assetLink}
                            title={this.props.asset.title}>
                            {this.props.asset.title}
                        </a>
                    </h5>
                </div>
                <MySelections
                    asset={this.props.asset}
                    onSelectedAnnotationUpdate={this.onSelectedAnnotationUpdate}
                    currentUser={this.props.currentUser} />
                <ClassSelections
                    asset={this.props.asset}
                    onSelectedAnnotationUpdate={this.onSelectedAnnotationUpdate}
                    currentUser={this.props.currentUser} />
            </div>
        );
    }
    componentDidMount() {
        if (this.asset.getType() === 'image') {
            const img = this.asset.getImage();

            const extent = [
                0, 0,
                img.width, img.height
            ];

            const projection = new Projection({
                code: 'Flatland:1',
                units: 'pixels',
                extent: extent
            });

            this.map = new Map({
                target: `map-${this.props.asset.id}`,
                controls: [],
                interactions: [],
                layers: [
                    new ImageLayer({
                        source: new Static({
                            url: img.url,
                            projection: projection,
                            imageExtent: extent
                        })
                    })
                ],
                view: new View({
                    projection: projection,
                    center: getCenter(extent),
                    zoom: 0.5
                })
            });
        }
    }
}

GridAsset.propTypes = {
    asset: PropTypes.object.isRequired,
    currentUser: PropTypes.number.isRequired,
    toggleAssetView: PropTypes.func.isRequired
};
