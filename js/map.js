/**
 * Created by student on 4/7/2015.
 */
var map;
require(["esri/map",
        "esri/layers/ArcGISDynamicMapServiceLayer",
        "esri/layers/FeatureLayer",
        "esri/InfoTemplate",
        "esri/geometry/Extent",

        "esri/dijit/Scalebar",
        "esri/dijit/HomeButton",

        "dojo/parser",

        "dijit/layout/BorderContainer",
        "dijit/layout/ContentPane",
        "dijit/TitlePane",
        "dijit/layout/AccordionContainer",

        "esri/dijit/BasemapGallery",
        "esri/arcgis/utils",
        "esri/dijit/Legend",
        "dojo/dom",
        "dojo/dom-construct",
        "dojo/_base/array",
        "dijit/form/CheckBox",

        "esri/dijit/Search",

        "dojo/domReady!"],

    function(Map,
            ArcGISDynamicMapServiceLayer,
             FeatureLayer,
             InfoTemplate,
             Extent,

             Scalebar,
             HomeButton,

             parser,

             BorderContainer,
             ContentPane,
             TitlePane,
             AccordionContainer,

             BasemapGallery,
             utils,
             Legend,
             dom,
             domConstruct,
             arrayUtils,
             CheckBox,

             Search



    ) {
        parser.parse();

        var legendLayers = [];

    map = new Map("mapDiv", {
        //center: [-83.1132, 32.9605], //32.9605° N, 83.1132° W
        //zoom: 8,
        basemap: "streets",
        extent: new Extent({
            "xmin": -9523791.7082,
            "ymin": 3550183.0932,
            "xmax": -8999208.6662,
            "ymax": 4163381.654,
            "spatialReference": {
                "wkid": 102100
            }
        })

    });

        map.on("load", function() {

            initOperationalLayer();
            addWidgets();

        });

        map.on('layers-add-result', function () {
            var legend = new Legend({
                map: map,
                layerInfos: legendLayers
            }, "legendDiv");
            legend.startup();
        });

        map.on('layers-add-result', function () {
            //add check boxes
            arrayUtils.forEach(legendLayers, function (layer) {
                var layerName = layer.title;
                var checkBox = new CheckBox({
                    name: "checkBox" + layer.layer.id,
                    value: layer.layer.id,
                    checked: layer.layer.visible
                });
                checkBox.on("change", function () {
                    var targetLayer = map.getLayer(this.value);
                    targetLayer.setVisibility(!targetLayer.visible);
                    this.checked = targetLayer.visible;
                });

                //add the check box and label to the toc
                domConstruct.place(checkBox.domNode, dom.byId("toggle"), "after");
                var checkLabel = domConstruct.create('label', {
                    'for': checkBox.name,
                    innerHTML: layerName
                }, checkBox.domNode, "after");
                domConstruct.place("<br />", checkLabel, "after");
            });
        });



        function initOperationalLayer() {

            var dynamicLayerContraflow = new ArcGISDynamicMapServiceLayer(
                "https://egis.dot.ga.gov/arcgis/rest/services/CONTRAFLOW_ARMS/MapServer",
                {"opacity" : 0.5});

            //map.addLayer(dynamicLayerContraflow);
            //dynamicLayerContraflow.visible=false;

            legendLayers.push({ layer: dynamicLayerContraflow, title: 'dynamicLayerContraflow' });

            var infoTemplate = new InfoTemplate("${ROUTE_NUM}", "NHS Type:  ${NHS_TYPE}");
            var featureLayerNHS = new FeatureLayer("https://egis.dot.ga.gov/arcgis/rest/services/NHS_ROUTES/MapServer/0",{
                mode: FeatureLayer.MODE_ONDEMAND,
                outFields: ["*"],
                infoTemplate: infoTemplate
            });

            //map.addLayer(featureLayer);
            map.infoWindow.resize(250,75)

            legendLayers.push({ layer: featureLayerNHS, title: 'featureLayerNHS' });

            var featureLayerDistricts = new FeatureLayer("https://egis.dot.ga.gov/arcgis/rest/services/GeoTRAQSExternal/MapServer/63",{
                mode: FeatureLayer.MODE_ONDEMAND,
                outFields: ["*"]
            });

            legendLayers.push({ layer: featureLayerDistricts, title: 'featureLayerDistricts' });

            map.addLayers([dynamicLayerContraflow,featureLayerNHS,featureLayerDistricts]);
        }

        function addWidgets(){
            var scalebar = new Scalebar({map: map, scalebarUnit: "dual"});

            var home = new HomeButton({map: map}, "HomeButton");
            home.startup();

            //add the basemap gallery, in this case we'll display maps from ArcGIS.com including bing maps
            var basemapGallery = new BasemapGallery({
                showArcGISBasemaps: true,
                map: map
            }, "basemapGallery");
            basemapGallery.startup();

            basemapGallery.on("error", function(msg) {
                console.log("basemap gallery error:  ", msg);
            });

            var s = new Search({
                enableButtonMode: true, //this enables the search widget to display as a single button
                enableLabel: false,
                enableInfoWindow: true,
                showInfoWindowOnSelect: false,
                map: map
            }, "search");

            var sources = s.get("sources");

            //Push the sources used to search, by default the ArcGIS Online World geocoder is included. In addition there is a feature layer of US congressional districts. The districts search is set up to find the "DISTRICTID". Also, a feature layer of senator information is set up to find based on the senator name.

            sources.push({
                featureLayer: new FeatureLayer("https://egis.dot.ga.gov/arcgis/rest/services/GeoTRAQSExternal/MapServer/63"),
                searchFields: ["GDOT_DISTRICT"],
                displayField: "DISTRICT_NAME",
                exactMatch: false,
                outFields: ["DISTRICT_NAME","GDOT_DISTRICT","DISTRICT_URL", "EFFECTIVE_DATE"],
                name: "GDOT Districts",
                placeholder: "1",
                maxResults: 6,
                maxSuggestions: 6,

                //Create an InfoTemplate and include three fields
                infoTemplate: new InfoTemplate("GDOT District", "District Name: ${DISTRICT_NAME}</br>ID: ${GDOT_DISTRICT}</br>URL: ${DISTRICT_URL}"),
                enableSuggestions: true,
                minCharacters: 0
            });
            s.set("sources", sources);

            s.startup();

        }

});