angular.module("controk")
    .controller("ClientsListCtrl", ["$scope", "Client",
        function($scope, Client) {
            Client.list().then(function(response) {
                /**
                 * @type {{id, name, email, cpf, observation}}
                 */
                $scope.clients = response.data;
            });
        }
    ])
    .controller("ClientDetailCtrl", ["$scope", "$stateParams", "Client",
        function($scope, $stateParams, Client) {
            /**
             * @type {{
             * id, name, observation, cpf, email, mobile, phone, place_options: [{id, name}],
             * address: {place, place_name, number, complement, neighborhood, city, state, cep}
             * }}
             */
            $scope.client = {};

            Client.info($stateParams.id).then(function(infoResponse) {
                // The existence of an email will define that the data is already in the $stateParams
                if (!$stateParams.email)
                    Client.retrieve($stateParams.id).then(function(retrieveResponse) {
                        $scope.client = prepareClient(Object.assign(infoResponse.data, retrieveResponse.data));
                    });

                else $scope.client = prepareClient(Object.assign(infoResponse.data, $stateParams));
            });

            function prepareClient(client) {
                // Build the "place" attribute to resolve Angular default selected
                // It must come to the single value at update
                for (var i = 0; i < client.place_options.length; i++)
                    if (client.place_options[i].id == client.address.place)
                        client.address.place = client.place_options[i];

                return client;
            }
        }
    ])
    .controller("EmployeeCtrl", ["$scope", "Employee",
        function($scope, Employee) {
            Employee.list().then(function(response) {
                /**
                 * @type {{id, name, role, email, cpf, observation}}
                 */
                $scope.employees = response.data;
            });
        }
    ])
    .controller("ProductCtrl", ["$scope", "Product",
        function($scope, Product) {
            Product.list().then(function(response) {
                /**
                 * @type {{id, name, description, cost, sell_value}}
                 */
                $scope.products = response.data;
            });
        }
    ])
    .controller("ShipmentCtrl", ["$scope", "Shipment",
        function($scope, Shipment) {
            Shipment.list().then(function(response) {
                /**
                 * @type {{id, delivery_date, payment_date, order_date}}
                 */
                $scope.shipments = response.data;
            });
        }
    ])
    .controller("SupplierCtrl", ["$scope", "Supplier",
        function($scope, Supplier) {
            Supplier.list().then(function(response) {
                /**
                 * @type {{id, trading_name, email, cnpj}}
                 */
                $scope.suppliers = response.data;
            });
        }
    ]);