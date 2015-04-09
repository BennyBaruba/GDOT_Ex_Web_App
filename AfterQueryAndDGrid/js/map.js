var map;
require([
        "esri/map",
        "esri/layers/ArcGISDynamicMapServiceLayer",
        "esri/layers/FeatureLayer",
        "esri/InfoTemplate",
        "esri/geometry/Extent",
        "esri/dijit/Scalebar",
        "esri/dijit/HomeButton",
        "esri/dijit/BasemapGallery",
        "esri/arcgis/utils",
        "esri/dijit/Legend",
        "esri/dijit/Search",
        "esri/tasks/locator",
        "esri/SpatialReference",
        "esri/graphic",
        "esri/symbols/SimpleLineSymbol",
        "esri/symbols/SimpleMarkerSymbol",
        "esri/symbols/Font",
        "esri/symbols/TextSymbol",
        "esri/geometry/Point",
        "esri/geometry/webMercatorUtils",
        "esri/Color",
        "dojo/_base/declare",
        "dojo/_base/array",
        "esri/tasks/query",
        "dojo/number",
        "dojo/json",
        "dijit/registry",
        "esri/symbols/SimpleFillSymbol",
        "esri/renderers/UniqueValueRenderer",
        "esri/toolbars/draw",
        "dgrid/OnDemandGrid",
        "dgrid/Selection",
        "dojo/store/Memory",
        "esri/dijit/Print",
        "dojo/parser",
        "dijit/layout/BorderContainer",
        "dijit/layout/ContentPane",
        "dijit/TitlePane",
        "dojo/dom",
        "dojo/dom-construct",
        "dojo/_base/array",
        "dijit/form/CheckBox",
        "dijit/layout/AccordionContainer",
        "dojo/domReady!"],
    function (Map,
              ArcGISDynamicMapServiceLayer,
              FeatureLayer,
              InfoTemplate,
              Extent,
              Scalebar,
              HomeButton,
              BasemapGallery,
              utils,
              Legend,
              Search,
              Locator,
              SpatialReference,
              Graphic,
              SimpleLineSymbol,
              SimpleMarkerSymbol,
              Font,
              TextSymbol,
              Point,
              webMercatorUtils,
              Color,
              declare,
              array,
              Query,
              number,
              JSON,
              registry,
              SimpleFillSymbol,
              UniqueValueRenderer,
              Draw,
              Grid,
              Selection,
              Memory,
              Print,
              parser,
              BorderContainer,
              ContentPane,
              TitlePane,
              dom,
              domConstruct,
              arrayUtils,
              CheckBox,
              AccordionContainer) {

        parser.parse();

        var gridQuakes = new (declare([Grid, Selection]))({
            bufferRows: Infinity,
            columns: {
                BRIDGE_ID: "ID",
                RCLINK: "RCLINK",
                MILEPOINT: "MILEPOINT",
                COUNTY: "COUNTY"
            }
        }, "divGrid");


        var legendLayers = [];
        var GDOTDistrictsLayer;
        var BridgesLayer;
        map = new Map("mapDiv", {
            //center: [-83.1132, 32.9605],
            //zoom: 7,
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

        locator = new Locator("http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer");

        registry.byId("locate").on("click", locate);

        //Draw and zoom to the result when the geocoding is complete
        locator.on("address-to-locations-complete", function (evt) {
            map.graphics.clear();
            arrayUtils.forEach(evt.addresses, function (geocodeResult, index) {
                //create a random color for the text and marker symbol
                var r = Math.floor(Math.random() * 250);
                var g = Math.floor(Math.random() * 100);
                var b = Math.floor(Math.random() * 100);

                var symbol = new SimpleMarkerSymbol(
                    SimpleMarkerSymbol.STYLE_CIRCLE,
                    20,
                    new SimpleLineSymbol(
                        SimpleLineSymbol.STYLE_SOLID,
                        new Color([r, g, b, 0.5]),
                        10
                    ), new Color([r, g, b, 0.9]));
                var pointMeters = webMercatorUtils.geographicToWebMercator(geocodeResult.location);
                var locationGraphic = new Graphic(pointMeters, symbol);

                var font = new Font().setSize("12pt").setWeight(Font.WEIGHT_BOLD);
                var textSymbol = new TextSymbol(
                    (index + 1) + ".) " + geocodeResult.address,
                    font,
                    new Color([r, g, b, 0.8])
                ).setOffset(5, 15);
                //add the location graphic and text with the address to the map
                map.graphics.add(locationGraphic);
                map.graphics.add(new Graphic(pointMeters, textSymbol));
            });
            var ptAttr = evt.addresses[0].attributes;
            var minx = parseFloat(ptAttr.Xmin);
            var maxx = parseFloat(ptAttr.Xmax);
            var miny = parseFloat(ptAttr.Ymin);
            var maxy = parseFloat(ptAttr.Ymax);

            var esriExtent = new Extent(minx, miny, maxx, maxy, new SpatialReference({wkid: 4326}));
            map.setExtent(webMercatorUtils.geographicToWebMercator(esriExtent));

            showResults(evt.addresses);
        });

        //Perform the geocode. This function runs when the "Locate" button is pushed.
        function locate() {
            var address = {
                SingleLine: dom.byId("address").value
            };
            var options = {
                address: address,
                outFields: ["*"]
            };
            //optionally return the out fields if you need to calculate the extent of the geocoded point
            locator.addressToLocations(options);
        }


        map.on("load", function () {
            initOperationalLayer();
            addWidgets();
            initDrawTool();
        });

        map.on("click", computeViewShed);

        function selectQuakes(geometryInput) {

            // Define symbol for selected features (using JSON syntax for improved readability!)
            var symbolSelected = new SimpleMarkerSymbol({
                "type": "esriSMS",
                "style": "esriSMSCircle",
                "color": [255, 115, 0, 128],
                "size": 6,
                "outline": {
                    "color": [255, 0, 0, 214],
                    "width": 1
                }
            });

            /*
             * Step: Set the selection symbol
             */
            BridgesLayer.setSelectionSymbol(symbolSelected);
            BridgesLayer.on("selection-complete", populateGrid);
            /*
             * Step: Initialize the query
             */
            var queryQuakes = new Query();
            queryQuakes.geometry = geometryInput;

            /*
             * Step: Wire the layer's selection complete event
             */
            //BridgesLayer.on("selection-complete", populateGrid);

            /*
             * Step: Perform the selection
             */
            BridgesLayer.selectFeatures(queryQuakes, FeatureLayer.SELECTION_NEW);

        }

        function populateGrid(results) {

            var gridData;

            dataQuakes = array.map(results.features, function (feature) {
                return {
                    /*
                     * Step: Reference the attribute field values
                     */
                    "BRIDGE_ID": feature.attributes["BRIDGE_ID"],
                    "RCLINK": feature.attributes["RCLINK"],
                    "MILEPOINT": feature.attributes["MILEPOINT"],
                    "COUNTY": feature.attributes["COUNTY"]

                }
            });

            // Pass the data to the grid
            var memStore = new Memory({
                data: dataQuakes
            });
            gridQuakes.set("store", memStore);
        }


        function initDrawTool() {
            /*
             * Step: Implement the Draw toolbar
             */
            var tbDraw = new Draw(map);
            tbDraw.on("draw-end", displayPolygon);
            tbDraw.activate(Draw.POLYGON);

        }

        function displayPolygon(evt) {

            // Get the geometry from the event object
            var geometryInput = evt.geometry;

            // Define symbol for finished polygon
            var tbDrawSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([255, 255, 0]), 2), new Color([255, 255, 0, 0.2]));

            // Clear the map's graphics layer
            //map.graphics.clear();


            /*
             * Step: Construct and add the polygon graphic
             */
            var graphicPolygon = new Graphic(geometryInput, tbDrawSymbol);
            map.graphics.add(graphicPolygon);

            //// Call the next function
            selectQuakes(geometryInput);
        }


        function computeViewShed(evt) {
            //map.graphics.clear();
            var pointSymbol = new SimpleMarkerSymbol();
            pointSymbol.setSize(14);
            pointSymbol.setOutline(new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0]), 1));
            pointSymbol.setColor(new Color([255, 0, 0, 0.25]));

            var graphic = new Graphic(evt.mapPoint, pointSymbol);
            map.graphics.add(graphic);

            //var features = [];
            //features.push(graphic);
            //var featureSet = new FeatureSet();
            //featureSet.features = features;
            //var vsDistance = new LinearUnit();
            //vsDistance.distance = 5;
            //vsDistance.units = "esriMiles";
            //var params = {
            //    "Input_Observation_Point": featureSet,
            //    "Viewshed_Distance": vsDistance
            //};
            //gp.execute(params, drawViewshed);
        }


        function initOperationalLayer() {
            var contraDynLyr = new ArcGISDynamicMapServiceLayer("https://egis.dot.ga.gov/arcgis/rest/services/CONTRAFLOW_ARMS/MapServer", {opacity: 0.7});
            //map.addLayer(contraDynLyr);
            //contraDynLyr.visible = false;

            var infoTemplateNHS = new InfoTemplate("${ROUTE_NUM}", "Route Type:  ${ROUTE_TYPE}");
            var NHSLayer = new FeatureLayer("https://egis.dot.ga.gov/arcgis/rest/services/NHS_ROUTES/MapServer/0", {
                mode: FeatureLayer.MODE_ONDEMAND,
                outFields: ["*"],
                infoTemplate: infoTemplateNHS
            });

            var defaultSymbol = new SimpleFillSymbol().setStyle(SimpleFillSymbol.STYLE_NULL);
            defaultSymbol.setColor(new Color([255, 0, 0, 0.5]));
            defaultSymbol.outline.setStyle(SimpleLineSymbol.STYLE_NULL);

            //create renderer
            var renderer = new UniqueValueRenderer(defaultSymbol, "GDOT_DISTRICT");

            //add symbol for each possible value

            //renderer.addValue("District Seven- Chamblee", new SimpleFillSymbol().setColor(new Color([255, 0, 0, 0.5])));
            //renderer.addValue("District Six- Cartersville", new SimpleFillSymbol().setColor(new Color([0, 255, 0, 0.5])));


            ////add symbol for each possible value
            renderer.addValue("1", new SimpleFillSymbol().setColor(new Color([255, 0, 0, 0.5])));
            renderer.addValue("2", new SimpleFillSymbol().setColor(new Color([0, 255, 0, 0.5])));
            renderer.addValue("3", new SimpleFillSymbol().setColor(new Color([0, 0, 255, 0.5])));
            renderer.addValue("4", new SimpleFillSymbol().setColor(new Color([255, 0, 255, 0.5])));
            renderer.addValue("5", new SimpleFillSymbol().setColor(new Color([255, 255, 255, 0.75])));
            renderer.addValue("6", new SimpleFillSymbol().setColor(new Color([0, 255, 255, 0.5])));
            renderer.addValue("7", new SimpleFillSymbol().setColor(new Color([255, 255, 0, 0.5])));

            GDOTDistrictsLayer = new FeatureLayer("https://egis.dot.ga.gov/arcgis/rest/services/GeoTRAQSExternal/MapServer/63", {
                mode: FeatureLayer.MODE_ONDEMAND,
                outFields: ["DISTRICT_NAME"]
                //,
                //renderer: renderer
            });


            GDOTDistrictsLayer.setRenderer(renderer);

            BridgesLayer = new FeatureLayer("https://egis.dot.ga.gov/arcgis/rest/services/GeoTRAQSExternal/MapServer/12", {
                mode: FeatureLayer.MODE_SELECTION,
                outFields: ["*"]
            });


            //map.addLayer(featureLayer);


            map.on('layers-add-result', function () {
                var legend = new Legend({
                    map: map,
                    layerInfos: legendLayers
                }, "legendDiv");
                legend.startup();

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


            legendLayers.push({layer: contraDynLyr, title: 'Contraflow Arms'});
            legendLayers.push({layer: NHSLayer, title: 'NHS Routes'});
            legendLayers.push({layer: GDOTDistrictsLayer, title: 'GDOT Districts'});
            legendLayers.push({layer: BridgesLayer, title: 'Bridges'});

            map.addLayers([contraDynLyr, NHSLayer, GDOTDistrictsLayer, BridgesLayer]);
            map.infoWindow.resize(155, 75);

        }

        function addWidgets() {
            var scalebar = new Scalebar({
                map: map,
                // "dual" displays both miles and kilmometers
                // "english" is the default, which displays miles
                // use "metric" for kilometers
                scalebarUnit: "dual"
            });

            var home = new HomeButton({
                map: map
            }, "HomeButton");
            home.startup();
            //add the basemap gallery, in this case we'll display maps from ArcGIS.com including bing maps
            var basemapGallery = new BasemapGallery({
                showArcGISBasemaps: true,
                map: map
            }, "basemapGallery");
            basemapGallery.startup();

            basemapGallery.on("error", function (msg) {
                console.log("basemap gallery error:  ", msg);
            });

            var search = new Search({
                map: map
            }, "search");

            var sources = search.get("sources");

            //Push the sources used to search, by default the ArcGIS Online World geocoder is included. In addition there is a feature layer of US congressional districts. The districts search is set up to find the "DISTRICTID". Also, a feature layer of senator information is set up to find based on the senator name.

            sources.push({
                featureLayer: GDOTDistrictsLayer,
                searchFields: ["GDOT_DISTRICT"],
                displayField: "DISTRICT_NAME",
                exactMatch: false,
                outFields: ["GDOT_DISTRICT", "DISTRICT_NAME", "DISTRICT_URL"],
                name: "GDOT Districts",
                placeholder: "7",
                maxResults: 6,
                maxSuggestions: 6,

                //Create an InfoTemplate and include three fields
                infoTemplate: new InfoTemplate("GDOT District", "District ID: ${GDOT_DISTRICT}</br>Name: ${DISTRICT_NAME}</br>District URL: <a href='${DISTRICT_URL}' >More Info...</a>"),
                enableSuggestions: true,
                minCharacters: 0
            });


            //Set the sources above to the search widget
            search.set("sources", sources);

            search.startup();


            var printer = new Print({

                map: map,
                url: "http://sampleserver6.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"
            }, dom.byId("printButton"));
            printer.startup();
        }

    });