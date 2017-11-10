// Initialize your app
var myApp = new Framework7({
    animateNavBackIcon: true,
    // Enable templates auto precompilation
    precompileTemplates: true,
    // Enabled pages rendering using Template7
	swipeBackPage: false,
	swipeBackPageThreshold: 1,
	//swipePanel: "left",
	//swipePanelCloseOpposite: true,
	pushState: true,
	pushStateRoot: undefined,
	pushStateNoAnimation: false,
	pushStateSeparator: '#!/',
    template7Pages: true
});

var urlSync = 'http://192.168.0.102:8080/procity/soa/service/mobile.';
var listaOcorrencias = [];
var listaTipoOcorrencias = [];
var map;
var mapEnde;
var markerEndereco;
var enderecoOcorrencia = "";
var latitude = "";
var longitude = "";

// Export selectors engine
var $$ = Dom7;

// Add main View
var mainView = myApp.addView('.view-main', {
    // Enable dynamic Navbar
    dynamicNavbar: false
});

$$(document).on('ajaxStart',function(e){myApp.showIndicator();});
$$(document).on('ajaxComplete',function(){myApp.hideIndicator();});																																																																		

$$(document).on('pageInit', function (e) {

	$(".swipebox").swipebox();
	$("#ocorrenciaFormulario").validate();
	$("#registerFormulario").validate();
	$("#loginFormulario").validate();
	$("#forgotFormulario").validate();
	
	$('a.backbutton').click(function(){
		parent.history.back();
		return false;
	});
	
});

/** abaixo os códigos personalizados */
$$(document).on('pageInit', '.page[data-page="mapa"]', function (e) {
	
	// verificando se o usuario está logado no sistema
	if (window.localStorage.getItem("email_usuario") == "" || window.localStorage.getItem("email_usuario") == undefined){
		// caso não esteja logado exibe a mensgem informando que é necessário estar logado
		$("#descMapa").text("Você precisa estar logado para visualizar suas ocorrências");
    }
	
	var defaultLatLng = new google.maps.LatLng(-21.292855, -46.685126);  // Default to Formiga/MG, CA when no geolocation support -20.462245, -45.430365
    if ( navigator.geolocation ) {      
        function success(pos) {
            latitude = pos.coords.latitude;
            longitude = pos.coords.longitude;
            // pegando o endereço            
            var latlng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
            var geocoder = new google.maps.Geocoder();
            geocoder.geocode({
                'latLng': latlng
            }, function(results, status) {
                enderecoOcorrencia = '' + results[0].formatted_address.replace("Brazil","") + '';
            });                
            // Location found, show map with these coordinates
            drawMap(latlng, 14);          
        }
        function fail(error) {          
            myApp.alert('Não foi possível pegar sua posição através do GPS!\n' +
            'Código: ' + error.code + '\n' +
            'Mensagem: ' + error.message, 'Atenção!');

            drawMap(defaultLatLng,14);  // Failed to find location, show default map
        }
        // Find the users current position.  Cache the location for 5 minutes, timeout after 6 seconds
        navigator.geolocation.getCurrentPosition(success, fail, {maximumAge: 500000, enableHighAccuracy:true, timeout: 10000});
    } else {   
        navigator.notification.alert('Verifique se sua internet e seu GPS estão ativados!', function(){}, 'Atenção!', 'Fechar');
        drawMap(defaultLatLng, 14);  // No geolocation support, show default map
    }
  
    function drawMap(latlng, zoomSize) {
        var myOptions = {
            zoom: zoomSize,
            center: latlng,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };      
        map = new google.maps.Map(document.getElementById("map-canvas"), myOptions);

        // linhas abaixo colocadas para redimensionar os mapas
        var center = map.getCenter();
        google.maps.event.trigger(map, "resize");
        map.setCenter(center);

        buscarMinhasOcorrencias(true);
    }
});


/**
* Realizando a busca dos tipos de ocorrencia
*/
function buscaTipoOcorrencias(){
    
    if (window.localStorage.getItem("email_usuario") == "" || window.localStorage.getItem("email_usuario") == undefined){
		return false;
    }

    // gerando o token para o acesso ao servidor
    token = gerarTokenSync(window.localStorage.getItem("email_usuario"), window.localStorage.getItem("senha_usuario"));

    var urlSyncOcorrencia = urlSync + "tipoOcorrencia?token=" + token + "(" + window.localStorage.getItem("email_usuario")  + ")";

    // realiza a chamada no servidor
    $.ajax({
        url: urlSyncOcorrencia,
        type: 'GET',
        async: false,
        cache: false,
        timeout: 90000,        
        // retorno de sucesso da chamada
        success: function( data ) {
            if (data.tipoOcorrencia != null){      
                listaTipoOcorrencias = [];
                // exibindo os marcadores no mapa
                $.each(data.tipoOcorrencia, function(index, tipoOcorrencia) {    
                    listaTipoOcorrencias.push(tipoOcorrencia);                             
                });

                // setando a lista de tipos de ocorrencia no localstorage
                window.localStorage.setItem("tipoOcorrencias", listaTipoOcorrencias);
				
            } else {
                // retornando que não encotrou a pessoa
                data = $.parseJSON(data);
                exibeErroSincronizar(data);
                return;          
            }
        },

        // retorno de erro da chamada
        error: function(jqXHR, exception) {
            trataErroSincronizacao(jqXHR, exception);
            return;
        }
    });    

}

/**
* Realiza a busca das ocorrencias
*/
function buscarMinhasOcorrencias(colocarMarcadores){  

	// verificando se possui email e senha cadastrados
	if (window.localStorage.getItem("email_usuario") == '' || window.localStorage.getItem("email_usuario") == undefined){
		return false;
	}

    // gerando o token para o acesso ao servidor
    token = gerarTokenSync(window.localStorage.getItem("email_usuario"), window.localStorage.getItem("senha_usuario"));

    var urlSyncOcorrencia = urlSync + "ocorrencia?token=" + token + "(" + window.localStorage.getItem("email_usuario") + ")";

    // realiza a chamada no servidor
    $.ajax({
        url: urlSyncOcorrencia,
        type: 'GET',
        async: false,
        cache: false,
        timeout: 90000,        
        // retorno de sucesso da chamada
        success: function( data ) {
            listaOcorrencias = [];
            if (data.ocorrencia != null){                    
                // exibindo os marcadores no mapa
                $.each(data.ocorrencia, function(index, ocorrencia) {    
                    listaOcorrencias.push(ocorrencia);                                                  
                });

				if (colocarMarcadores){
					colocaMarcadoresMapa(); 
				}
                
            } else {
                // retornando que ouve um erro
                data = $.parseJSON(data);
                exibeErroSincronizar(data);
                return;          
            }
        },

        // retorno de erro da chamada
        error: function(jqXHR, exception) {
            trataErroSincronizacao(jqXHR, exception);
            return;
        }
    });    
}

/**
* exibido os marcadores no mapa com as ocorrencias que eu criei
*/
function colocaMarcadoresMapa(){
    var infowindow = new google.maps.InfoWindow();
    var marker;
    var conteudo = "";
    var conteudoFoto;
    var foto;
    if (listaOcorrencias.length > 0) {        
        for (var i = 0; i < listaOcorrencias.length; i++) {
            var ocorrencia = listaOcorrencias[i];

            foto = ocorrencia.conteudoBinarioFoto;            
            if (null != foto && foto.indexOf('image') > 0){    
                conteudoFoto = '<center><img src="' + foto + '" height="100" width="150"/></center>';        
            } else {
                conteudoFoto = '<center><img src="img/sem_imagem.jpg" height="100" width="150"/></center>';
            }	
            
            if (ocorrencia.observacao == null){
                ocorrencia.observacao = "";
            }
            
            // Variável que define o conteúdo da Info Window
            conteudo = '<div id="iw-container">' +
                    '<div class="iw-title"> Tipo: ' + ocorrencia.descricaoTipo + ' </div>' +
                    '<div class="iw-content">' + conteudoFoto +
                      '<p><b>Data: </b>' + ocorrencia.dataOcorrencia + '<br/>' +
                      '<b>Endereço: </b>' + ocorrencia.endereco + '<br>' +
                      '<b>Status: </b>' + ocorrencia.statusOcorrencia.lookup + '<br/>' +
                      '<b>Observação: </b>' + ocorrencia.observacao + '<br/> </p>' +
                      '<p><b>PROTOCOLO:</b><br/>' + ocorrencia.protocolo + '</p>'+                      
                    '</div>' +
                    '<div class="iw-bottom-gradient"></div>' +
                  '</div>';

            var titulo = "";
            titulo = "<p><b>Tipo: </b>" + ocorrencia.descricaoTipo + "</p>";

            var icone;

            if (ocorrencia.statusOcorrencia.lookup == "Em Aberto") {
                icone = "http://maps.google.com/mapfiles/ms/micons/red-dot.png";                        
            } else if (ocorrencia.statusOcorrencia.lookup == "Encaminhada") {
                icone = "http://maps.google.com/mapfiles/ms/micons/blue-dot.png";                        
            } else if (ocorrencia.statusOcorrencia.lookup == "Em Análise") {
                icone = "http://maps.google.com/mapfiles/ms/micons/yellow-dot.png";                        
            } else {
                icone = "http://maps.google.com/mapfiles/ms/micons/green-dot.png";                        
            }

            marker = new google.maps.Marker({
                position: new google.maps.LatLng(ocorrencia.latitude, ocorrencia.longitude),
                title: titulo,
                map: map,
                icon: icone
            });
            marker.html = conteudo;

            var id = ocorrencia.id;
			
            google.maps.event.addListener(marker, 'click', (function(marker, id) {
                return function() {
                  infowindow.setContent(this.html);
                  infowindow.open(map, this);
                }
            })(marker, id));

              // evento que fecha a infoWindow com click no mapa
            google.maps.event.addListener(map, 'click', function() {
                infowindow.close();
            });

        google.maps.event.addListener(infowindow, 'domready', function() {
  
            // Referência ao DIV que agrupa o fundo da infowindow
            var iwOuter = $('.gm-style-iw');

            /* Uma vez que o div pretendido está numa posição anterior ao div .gm-style-iw.
            * Recorremos ao jQuery e criamos uma variável iwBackground,
            * e aproveitamos a referência já existente do .gm-style-iw para obter o div anterior com .prev().
            */
            var iwBackground = iwOuter.prev();

            // Remover o div da sombra do fundo
            iwBackground.children(':nth-child(2)').css({'display' : 'none'});

            // Remover o div de fundo branco
            iwBackground.children(':nth-child(4)').css({'display' : 'none'});

			/*
            // Desloca a infowindow 115px para a direita
            iwOuter.parent().parent().css({left: '115px'});

            // Desloca a sombra da seta a 76px da margem esquerda 
            iwBackground.children(':nth-child(1)').attr('style', function(i,s){ return s + 'left: 76px !important;'});

            // Desloca a seta a 76px da margem esquerda 
            iwBackground.children(':nth-child(3)').attr('style', function(i,s){ return s + 'left: 76px !important;'});
*/
            // Altera a cor desejada para a sombra da cauda
            iwBackground.children(':nth-child(3)').find('div').children().css({'box-shadow': 'rgba(72, 181, 233, 0.6) 0px 1px 6px', 'z-index' : '1'});

            // Referência ao DIV que agrupa os elementos do botão fechar
            var iwCloseBtn = iwOuter.next();

            // Aplica o efeito desejado ao botão fechar
            iwCloseBtn.css({opacity: '1', right: '50px', top: '3px', border: '7px solid #48b5e9', 'border-radius': '13px', 'box-shadow': '0 0 5px #3990B9'});

            // Se o conteúdo da infowindow não ultrapassar a altura máxima definida, então o gradiente é removido.
            if($('.iw-content').height() < 140){
              $('.iw-bottom-gradient').css({display: 'none'});
            }

            // A API aplica automaticamente 0.7 de opacidade ao botão após o evento mouseout. Esta função reverte esse evento para o valor desejado.
            iwCloseBtn.mouseout(function(){
              $(this).css({opacity: '1'});
            });
          });  
        }
    }
}


/** 
* Gera o token para sincronizaão dos dados 
*/
function gerarTokenSync(emailUsuario, senhaUsuario){
	// cripitografando a senha informada pelo usuario
	var senhaCrip = $.md5(senhaUsuario);

	// concatenando a data atual no formato esperado yyyyMMddHH
	var dataAtual = getDataAtual(false, true);

	// retorna o token critptografado
	return $.md5(emailUsuario + senhaCrip.toUpperCase() + dataAtual);
}

/*
* Retorna a data atual de acordo com os parametros informados
*/
function getDataAtual(exibeSeparador, exibeHoras){
	// ajustando a data atual
	var fullDate = new Date();
	// acrescenta o 0 caso o mes for menor que 10
	var mes = ("0" + (fullDate.getMonth() + 1)).slice(-2);
	// acrescenta o 0 caso o dia for menor que 10
	var dia = ("0" + fullDate.getDate()).slice(-2);
	// acrescenta o 0 caso a hora for menor que 10
	var horas =  ("0" + fullDate.getHours()).slice(-2);

	if (exibeHoras){
		return fullDate.getFullYear() + mes + dia;//  + horas;
	}

	if (exibeSeparador){
		return fullDate.getFullYear() + '-' + mes + '-' + dia;
	} 
}

/*
* Tratamento de erro ao realizar a sincronização
*/
function trataErroSincronizacao(jqXHR, exception){    
    var mensagem;
    if (jqXHR.status === 0) {
        mensagem = 'Sem conexão com a Internet.';
    } else if (jqXHR.status == 404) {
        mensagem = 'Página solicitada não encontrada.';
    } else if (jqXHR.status == 500) {   
        mensagem = 'Ocorreu um erro interno no servidor.';
    } else if (exception === 'parsererror') {
        mensagem = 'Ocorreu um erro ao converter os dados.';
    } else if (exception === 'timeout') {
        mensagem = 'Tempo de espera da solicitação esgotado.';
    } else if (exception === 'abort') {
        mensagem = 'Solicitação abortada.';
    } else {
        mensagem = 'Erro não categorizado.\n' + jqXHR.responseText;
    }
    // exibe o erro
	myApp.alert('Erro ao realizar a busca os dados!\n' +
        'Mensagem: ' + mensagem, 'Atenção!');  
}

/* 
* Exibe o erro ao realizar a sincronização
*/
function exibeErroSincronizar(data){
	myApp.alert('Erro ao realizar a busca os dados!\n' +
        'Mensagem: ' + data.messages.erro, 'Atenção!');
}


// listando os imoveis de trabalho
myApp.onPageBeforeInit('ocorrencia', function (page) {
	buscarMinhasOcorrencias(false);
});

// listando os imoveis de trabalho
$$(document).on('pageInit', '.page[data-page="ocorrencia"]', function (e) {
	// limpando a variavel que controla a visualização das ocorrencias
	window.localStorage.setItem("idOcorrencia", "");
	
    var listaMinhasOcorrencias = $("#listaMinhasOcorrencias");
    var lista = '';

    if (listaOcorrencias.length > 0) {	
		// listando todas as ocorrências fetias pelo usuário
        for (var i = 0; i < listaOcorrencias.length; i++) {
            var ocorrencia = listaOcorrencias[i]; 
			lista = lista + '<li class="swipeout"> <div class="swipeout-content item-content"> <div class="post_entry"><div class="post_date">';
			lista = lista + '<span class="day">'+ ocorrencia.dataOcorrencia.substring(0,2) + '</span>';
			lista = lista + '<div class="pr-aling-date"><span class="month">'+ getMesOcorrencia(ocorrencia.dataOcorrencia.substring(5,3)) + '</span></br>';
			lista = lista + '<span class="year">'+ ocorrencia.dataOcorrencia.substring(10,6) + '</span></div></div>';
			lista = lista + '<div class="post_title">';
			lista = lista + '<h2><a href="#" onclick="visualizarOcorrencia('+ocorrencia.id+')">'
			lista = lista + 'Tipo: ' + ocorrencia.descricaoTipo + '</br>';
            lista = lista + 'Endereço: ' + ocorrencia.endereco + '</br>';
            lista = lista + 'Status: ' + ocorrencia.statusOcorrencia.lookup + '</a></h2> </div>';
            lista = lista + '<div class="post_swipe"><img src="images/swipe_more.png" alt="" title="" /></div>';
            lista = lista + '</div></div></li>';
            /*lista = lista + '<div class="swipeout-actions-right">';
            lista = lista + '<a href="ocorrencia_detalhe.html" class="action1"><img src="images/icons/white/message.png" alt="" title="" /></a>';
			lista = lista + '<a href="#" class="action1 open-popup" data-popup=".popup-social"><img src="images/icons/white/like.png" alt="" title="" /></a>';
			lista = lista + '</div></li>';*/
        }
		listaMinhasOcorrencias.append(lista);
    } else if (window.localStorage.getItem("email_usuario") == '' || window.localStorage.getItem("email_usuario") == undefined){
		// caso não esteja logado exibe a mensgem informando que é necessário estar logado
		$("#descOcorrencia").text("Você precisa estar logado para visualizar suas ocorrências");
	}

});

/**
* Clique na lista de ocorrencias para visualizar uma determinada ocorrencia
*/
function visualizarOcorrencia(idOcorrencia){
	window.localStorage.setItem("idOcorrencia", idOcorrencia);
	mainView.router.loadPage("ocorrenciaDetalhe.html");
}

/**
* Evento de exibição da pagina de visualização de uma ocorrencia
*/ 
$$(document).on('pageInit', '.page[data-page="ocorrenciaDetalhe"]', function (e) {
	// pegando o id da ocorrencia que deseja visualizarv
	var id = window.localStorage.getItem("idOcorrencia");
	
	var ocorrencia;
	
	//buscando pela ocorrencia na lista
	for (var i = 0; i < listaOcorrencias.length; i++) {
		// verificando se é a ocorrencia desejada
		if (listaOcorrencias[i].id == id){
			ocorrencia = listaOcorrencias[i];
			break;
		}
	}
	
	// pegando os campos da tela e setando os valores desejados
	if (ocorrencia.conteudoBinarioFoto != null){
		$(".fotoOcorrenciaDetalhe img").remove('img');
		$('.fotoOcorrenciaDetalhe').append('<img src="' + ocorrencia.conteudoBinarioFoto + '" />'); 
	}
	
	$('.tipoOcorrenciaDetalhe').append('<h2>' + ocorrencia.descricaoTipo + '</h2>');
	$('.dataOcorrenciaDetalhe').text(ocorrencia.dataOcorrencia);
	$('.enderecoOcorrenciaDetalhe').text(ocorrencia.endereco);
	$('.statusOcorrenciaDetalhe').text(ocorrencia.statusOcorrencia.lookup);
	$('.observacaoOcorrenciaDetalhe').text(ocorrencia.observacao);
	$('.protocoloOcorrenciaDetalhe').text(ocorrencia.protocolo);
	
});

function getMesOcorrencia(mes){
	if (mes == 01){
		return "JAN";
	} else if (mes == 02){
		return "FEV";
	} else if (mes == 03){
		return "MAR";
	} else if (mes == 04){
		return "ABR";
	} else if (mes == 05){
		return "MAI";
	} else if (mes == 06){
		return "JUN";
	} else if (mes == 07){
		return "JUL";
	} else if (mes == 08){
		return "AGO";
	} else if (mes == 09){
		return "SET";
	} else if (mes == 10){
		return "OUT";
	} else if (mes == 11){
		return "NOV";
	} else if (mes == 12){
		return "DEZ";
	}
}

/**
* Evento para antes da exibiçã oda pagina de nova ocorrência
*/
myApp.onPageBeforeInit('novaOcorrencia', function (page) {
	// verificando se já buscou os tipos de ocorrência
	if (listaTipoOcorrencias.length == 0){
		// se não buscou ainda, realiza a busca
		buscaTipoOcorrencias();
	}
});

/**
* Evento para exibição da pagina de nova ocorrência
*/ 
$$(document).on('pageInit', '.page[data-page="novaOcorrencia"]', function (e) {
	
		// verificando se o usuario está logado no sistema
	if (window.localStorage.getItem("email_usuario") == "" || window.localStorage.getItem("email_usuario") == undefined){
		// caso não esteja logado exibe a mensgem informando que é necessário estar logado
		$("#descNovaOcorrencia").text("Você precisa estar logado para enviar suas ocorrências");
    }
	
    // removendo possiveis valores    
    $("#tipoOcorrencia").find("option").remove().end();
	
	// colocando a imagem da foto padrao
    $('#fotoOcorrencia').append('<img src="images/nenhuma_foto.png" />');       
			
    // inserindo os valores dos tipos de ocorrencia
    for (var i = 0; i < listaTipoOcorrencias.length; i++){  
		myApp.smartSelectAddOption('.smart-select select', '<option value=' + listaTipoOcorrencias[i].id +'>'+listaTipoOcorrencias[i].descricao +'</option>');     
    }
	
	// pegando o endereço atual 
	if ( navigator.geolocation ) {      
        function success(pos) {
            latitude = pos.coords.latitude;
            longitude = pos.coords.longitude;
            // pegando o endereço            
            var latlng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
            var geocoder = new google.maps.Geocoder();
            geocoder.geocode({
                'latLng': latlng
            }, function(results, status) {
                enderecoOcorrencia = '' + results[0].formatted_address.replace(", Brazil","") + '';
				$("#endereco").val(enderecoOcorrencia);
				$("#endereco").attr("disabled", "disabled");
            });
        }
        function fail(error) {          
            myApp.alert('Não foi possível pegar sua posição através do GPS!\n' +
            'Código: ' + error.code + '\n' +
            'Mensagem: ' + error.message, 'Atenção!');
        }
        // Find the users current position.  Cache the location for 5 minutes, timeout after 6 seconds
        navigator.geolocation.getCurrentPosition(success, fail, {maximumAge: 500000, enableHighAccuracy:true, timeout: 10000});
    } else {   
        myApp.alert('Verifique se sua internet e seu GPS estão ativados!', 'Atenção!');
    }	
	
});


// evento que captura a imagem da camera
function fotografar(){
	navigator.camera.getPicture(capturarSuccess, capturarFail,
		{
			destinationType : Camera.DestinationType.DATA_URL,
			sourceType : Camera.PictureSourceType.CAMERA
		});
}

//e xibindo a imagem que foi capturada
function capturarSuccess(imageData) {
	// Show the captured photo
	$("#fotoOcorrencia img").remove('img');
  
	if (imageData.indexOf("file") !== -1){
		$('#fotoOcorrencia').append('<img src="' + imageData + '" />'); 
	} else {
		$('#fotoOcorrencia').append('<img src="data:image/jpeg;base64,' + imageData + '" />');
	}
}

// erro de captura da foto
function capturarFail(message) {
	// solicita ao usuário informar um login e uma senha                
	myApp.alert(message, 'Atenção!');
}

/**
* realiza a escolha de uma foto na galeria
*/
function escolherFoto() {

    var srcType = Camera.PictureSourceType.SAVEDPHOTOALBUM;
    var options = setOptions(srcType);
    var func = createNewFileEntry;

	navigator.camera.getPicture(capturarSuccess, capturarFail, options);
	
}

function setOptions(srcType) {
    var options = {
        // Some common settings are 20, 50, and 100
        quality: 50,
        destinationType: Camera.DestinationType.FILE_URI,
        // In this app, dynamically set the picture source, Camera or photo gallery
        sourceType: srcType,
        encodingType: Camera.EncodingType.JPEG,
        mediaType: Camera.MediaType.PICTURE,
        allowEdit: true,
        correctOrientation: true  //Corrects Android orientation quirks
    }
    return options;
}

function createNewFileEntry(imgUri) {
    window.resolveLocalFileSystemURL(cordova.file.cacheDirectory, function success(dirEntry) {

        // JPEG file
        dirEntry.getFile("tempFile.jpeg", { create: true, exclusive: false }, function (fileEntry) {

            // Do something with it, like write to it, upload it, etc.
            // writeFile(fileEntry, imgUri);
            console.log("got file: " + fileEntry.fullPath);
            // displayFileData(fileEntry.fullPath, "File copied to");

        }, onErrorCreateFile);

    }, onErrorResolveUrl);
}

/**
* Ação do botão de Login
*/
$( "#loginFormulario" ).submit(function( event ) {
	if($("#email").val() != '' && $("#senha").val() != '') {
		realizaLogin();
	}
});

/*
* Realiza o login do usuário.
*/
function realizaLogin(){
          
	// gerando o token para o acesso ao servidor
	token = gerarTokenSync($("#email").val(), $("#senha").val());

	var urlSyncPessoa = urlSync + "pessoa?token=" + token + "(" + $("#email").val() + ")";

	// realiza a chamada no servidor
	$.ajax({
		url: urlSyncPessoa,
		type: 'GET',
		async: false,
		cache: false,
		timeout: 90000,        
		// retorno de sucesso da chamada
		success: function( data ) {
			if (data.pessoa != null){                    
				// armazenando os dados                    
				window.localStorage.setItem("email_usuario", data.pessoa[0].email);
				window.localStorage.setItem("senha_usuario", $("#senha").val());
				window.localStorage.setItem("nomePessoa", data.pessoa[0].nome);
				
				mainView.router.loadPage("index.html");
					
			} else {
				// retornando que não encotrou a pessoa
				data = $.parseJSON(data);
				exibeErroSincronizar(data);
				return;          
			}
		},

		// retorno de erro da chamada
		error: function(jqXHR, exception) {
			// escondendo o loading
			myApp.hideIndicator();
			
			// solicita ao usuário informar um login e uma senha                
			myApp.alert('Email e/ou senha incorretos!', 'Atenção!');
			
			return;
		}
	});
}

function realizaLogout(){
	// removendo os dados armazenados
    window.localStorage.removeItem("email_usuario");
    window.localStorage.removeItem("senha_usuario");   
	window.localStorage.removeItem("nomePessoa");   
	window.localStorage.removeItem("tipoOcorrencias"); 
	window.localStorage.removeItem("totalDenuncia");
	window.localStorage.removeItem("totalSugestao");
	window.localStorage.removeItem("totalOcorrencia");         	
	
    listaOcorrencias = [];
    listaTipoOcorrencias = [];
    enderecoOcorrencia = "";
    latitude = "";
    longitude = "";  
	
	$(".user_details p").remove('p')
}


/**
* realizando o cadastro do usuário
*/
function realizaCadastro(){

    // gerando o token para o acesso ao servidor
    token = gerarTokenSync($("#emailCad").val(), $("#senhaCad").val());    

    // gerando a url de envio dos dados
    var urlSyncPessoaCad = urlSync + "pessoa?token=" + token + "(" + $("#emailCad").val() + ")cadastro";

    var pessoa = new Object();
    pessoa.email = $("#emailCad").val();
    pessoa.senha = $("#senhaCad").val();
    pessoa.nome = $("#nomeCad").val();

    // transformando o objeto em uma string json
    var obj = JSON.stringify({ pessoa: pessoa });            
    // enviando os dados
    $.ajax({
        url: urlSyncPessoaCad,
        type: 'POST',
        contentType: "application.mob/json; charset=utf-8",
        data: obj,
        async: false,
        dataType: 'json',        
        success: function (data) {
			// armazenando os dados                    
			window.localStorage.setItem("email_usuario", data.pessoa[0].email);
			window.localStorage.setItem("senha_usuario", $("#senha").val());
			window.localStorage.setItem("nomePessoa", data.pessoa[0].nome);
			
			$(".user_details p").remove('p')
			$(".user_details").append('<p>Olá, <span>'+ data.pessoa[0].nome.split(" ")[0] +'</span></p>');
			
			myApp.hideIndicator();

			mainView.router.loadPage("index.html");
        },
        
        // retorno de erro da chamada
        error: function(jqXHR, exception) {
            trataErroSincronizacao(jqXHR, exception);
            return false;
        }

    });       
}

$$('.panel-left').on('opened', function () {
	if (window.localStorage.getItem("nomePessoa") != '' || window.localStorage.getItem("nomePessoa") != undefined){
	
		if ($(".user_details p").length == 0){
			$(".user_details p").remove('p')
			$(".user_details").append('<p>Olá, <span>'+ window.localStorage.getItem("nomePessoa").split(" ")[0] +'</span></p>');
		}
		
		var totalOcorrencia = window.localStorage.getItem("totalOcorrencia");
		if (totalOcorrencia == null){
			totalOcorrencia = 0;
		}
		$('.numOcorrencia').text(totalOcorrencia);
		
		var totalSugestao = window.localStorage.getItem("totalSugestao");
		if (totalSugestao == null){
			totalSugestao = 0;
		}
		$('.numSugestao').text(totalSugestao);
		
		var totalDenuncia = window.localStorage.getItem("totalDenuncia");
		if (totalDenuncia == null){
			totalDenuncia = 0;
		}
		$('.numDenuncia').text(totalDenuncia);
		
	}
});


function inicializaMapaAlterarEndereco(){
	initializeMap();
};

function initializeMap(){
	if (document.getElementById("map-canvas-ende").children.length == 0){
        // pegando o endereço            
        var latlng = new google.maps.LatLng(latitude, longitude);
       
        var myOptions = {
            zoom: 14,
            center: latlng,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };      
        
        var mapEnde = new google.maps.Map(document.getElementById("map-canvas-ende"), myOptions);

        // linhas abaixo colocadas para redimensionar os mapas
        var center = mapEnde.getCenter();
        google.maps.event.trigger(mapEnde, "resize");
        mapEnde.setCenter(center);

        markerEndereco = new google.maps.Marker({
            map: mapEnde,
            draggable: true,
            animation: google.maps.Animation.DROP,
            position: latlng
        });
        
		markerEndereco.addListener('click', toggleBounce);	
		
    }
    
}

function toggleBounce() {
    if (markerEndereco.getAnimation() !== null) {
      markerEndereco.setAnimation(null);
    } else {
      markerEndereco.setAnimation(google.maps.Animation.BOUNCE);
    }
}

function confirmaEndereco(){    
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'latLng': markerEndereco.getPosition()
    }, function(results, status) {
        enderecoOcorrencia = '' + results[0].formatted_address.replace(", Brazil","") + '';
		
        $("#endereco").val(enderecoOcorrencia);
        latitude = markerEndereco.getPosition().lat();
        longitude = markerEndereco.getPosition().lng();
		
		myApp.closeModal('.popup-alterar-endereco');
    });      
}


/**
* Faz o envio da ocorrencia
*/
function enviarOcorrencia(){
	
	// verificando se o usuario está logado no sistema
	if (window.localStorage.getItem("email_usuario") == "" || window.localStorage.getItem("email_usuario") == undefined){
		// caso não esteja logado exibe a mensgem informando que é necessário estar logado
		myApp.alert("Você precisa estar logado para enviar suas ocorrências", "Atenção!");
    }
	
	if ($("#tipoOcorrencia option:selected").val() == 0){ 
		return false;
	}
	
	if ($("#observacao").val() == ""){
		return false;
	}
	
	realizaEnvioOcorrencia();
}

function realizaEnvioOcorrencia(){
    // gerando o token para o acesso ao servidor
    token = gerarTokenSync(window.localStorage.getItem("email_usuario"), 
        window.localStorage.getItem("senha_usuario"));    

    // gerando a url de envio dos dados
    var urlSyncOcorrenciaCad = urlSync + "ocorrencia?token=" + token + "(" + window.localStorage.getItem("email_usuario") + ")";

    var ocorrencia = new Object();
    var pessoa = new Object();
    var tipoOcorrencia = new Object();
    tipoOcorrencia.id = $("#tipoOcorrencia option:selected").val();
    //tipoOcorrencia.descricao = $("#tipoOcorrencia option:selected").text();
    pessoa.email = window.localStorage.getItem("email_usuario");
    ocorrencia.pessoa = pessoa;
    ocorrencia.tipoOcorrencia = tipoOcorrencia;
    ocorrencia.observacao = $("#observacao").val();    
    ocorrencia.fotoApp =  $("#fotoOcorrencia").find("img").prop("src");
    ocorrencia.latitude = latitude;
    ocorrencia.longitude = longitude;

    // transformando o objeto em uma string json
    var obj = JSON.stringify({ ocorrencia: ocorrencia });            
    // enviando os dados
    $.ajax({
        url: urlSyncOcorrenciaCad,
        type: 'POST',
        contentType: "application.mob/json; charset=utf-8",
        data: obj,
        async: false,
        dataType: 'json',        
        success: function (data) {

            // enviando o alerta ao usuário com o numero do protocolo
            myApp.alert(
                'Ocorrência enviada com sucesso!\n' + 
                'PROTOCOLO\n' +
                data.ocorrencia.protocolo,
                'Atenção!'); 

			// adicionando 1 no contador de ocorrências
			var totalOcorrencia = window.localStorage.getItem("totalOcorrencia");
			if (totalOcorrencia == null){
				totalOcorrencia = listaOcorrencias.length;
			}
			totalOcorrencia = totalOcorrencia + 1;
			window.localStorage.setItem("totalOcorrencia", totalOcorrencia);
			
			// adicionando na lista local
			listaOcorrencias.push(data.ocorrencia);
            
        },
        
        // retorno de erro da chamada
        error: function(jqXHR, exception) {
            trataErroSincronizacao(jqXHR, exception);
            return false;
        }

    });      
}


/** abaixo os códigos personalizados */
$$(document).on('pageInit', '.page[data-page="sugestao"]', function (e) {
	// verificando se o usuario está logado no sistema
	if (window.localStorage.getItem("email_usuario") == "" || window.localStorage.getItem("email_usuario") == undefined){
		// caso não esteja logado exibe a mensgem informando que é necessário estar logado
		$("#descSugestao").text("Você precisa estar logado para enviar suas sugestões");
    }
});  

/**
* Realiza o envio da Sugestao
*/
function enviarSugestao(){
	// verificando se informou os dados obrigatorios
    if ($("#tituloSugestao").val() == ""){       
        return false;        
    }

    if ($("#descricaoSugestao").val() == ""){      
        return false;  
    }
	
	if (window.localStorage.getItem("email_usuario") == null){
		myApp.alert("Você precisa estar logado para enviar suas sugestões.", "Atenção!");
		return false;
	}

    // gerando o token para o acesso ao servidor
    token = gerarTokenSync(window.localStorage.getItem("email_usuario"), 
        window.localStorage.getItem("senha_usuario"));    

    // gerando a url de envio dos dados
    var urlSyncSugestao = urlSync + "sugestao?token=" + token + "(" + window.localStorage.getItem("email_usuario") + ")";

    var sugestao = new Object();
    var pessoa = new Object();
    //tipoOcorrencia.descricao = $("#tipoOcorrencia option:selected").text();
    pessoa.email = window.localStorage.getItem("email_usuario");
    sugestao.pessoa = pessoa;
	sugestao.titulo = $("#tituloSugestao").val();
	sugestao.endereco = $("#enderecoSugestao").val();
	sugestao.descricao = $("#descricaoSugestao").val();
	
    // transformando o objeto em uma string json
    var obj = JSON.stringify({ sugestao: sugestao });            
    // enviando os dados
    $.ajax({
        url: urlSyncsugestao,
        type: 'POST',
        contentType: "application.mob/json; charset=utf-8",
        data: obj,
        async: false,
        dataType: 'json',        
        success: function (data) { 
            myApp.alert(
                'Sugestão enviada com sucesso!\n' + 
                'PROTOCOLO\n' +
                data.sugestao.protocolo + "\n Guarde o nº do protocolo para consultar o que achamos da sua sugestao!",
                'Atenção!');
				
				// adicionando 1 no contador de denuncias
			var totalSugestao = window.localStorage.getItem("totalSugestao");
			if (totalSugestao == null){
				totalSugestao = 0;
			}
			totalSugestao = totalSugestao + 1;
			window.localStorage.setItem("totalSugestao", totalSugestao);
				
        },
        
        // retorno de erro da chamada
        error: function(jqXHR, exception) {
            trataErroSincronizacao(jqXHR, exception);
            return false;
        }

    });      	
	
}

/** abaixo os códigos personalizados */
$$(document).on('pageInit', '.page[data-page="denuncia"]', function (e) {
	// verificando se o usuario está logado no sistema
	if (window.localStorage.getItem("email_usuario") == "" || window.localStorage.getItem("email_usuario") == undefined){
		// caso não esteja logado exibe a mensgem informando que é necessário estar logado
		$("#descDenuncia").text("Você precisa estar logado para enviar suas denúncias");
    }
});  

/**
*/
function enviarDenuncia(){
	// verificando se informou os dados obrigatorios
    if ($("#tituloDenuncia").val() == ""){  
        return false;        
    }

    if ($("#descricaoDenuncia").val() == ""){
        return false;  
    }
	
	if (window.localStorage.getItem("email_usuario") == null){
		myApp.alert("Você precisa estar logado para enviar suas ideias.", "Atenção!");
		return false;
	}

    // gerando o token para o acesso ao servidor
    token = gerarTokenSync(window.localStorage.getItem("email_usuario"), 
        window.localStorage.getItem("senha_usuario"));    

    // gerando a url de envio dos dados
    var urlSyncDenuncia = urlSync + "denuncia?token=" + token + "(" + window.localStorage.getItem("email_usuario") + ")";

    var denuncia = new Object();
    var pessoa = new Object();
	
	if ($("#denunciaAnonima").is(":checked") == false){
		pessoa.email = window.localStorage.getItem("email_usuario");
		denuncia.pessoa = pessoa;
	}

	denuncia.titulo = $("#tituloDenuncia").val();
	denuncia.endereco = $("#enderecoDenuncia").val();
	denuncia.descricao = $("#descricaoDenuncia").val();
	
    // transformando o objeto em uma string json
    var obj = JSON.stringify({ denuncia: denuncia });            
    // enviando os dados
    $.ajax({
        url: urlSyncDenuncia,
        type: 'POST',
        contentType: "application.mob/json; charset=utf-8",
        data: obj,
        async: false,
        dataType: 'json',        
        success: function (data) { 
            myApp.alert(
                'Denúncia enviada com sucesso!\n' + 
                'PROTOCOLO\n' +
                data.denuncia.protocolo + "\n Guarde o nº do protocolo para consultar o andamento de sua denúncia!",
                'Atenção!');
			
			// adicionando 1 no contador de denuncias
			var totalDenuncia = window.localStorage.getItem("totalDenuncia");
			if (totalDenuncia == null){
				totalDenuncia = 0;
			}
			totalDenuncia = totalDenuncia + 1;
			window.localStorage.setItem("totalDenuncia", totalDenuncia);
				
				
        },
        
        // retorno de erro da chamada
        error: function(jqXHR, exception) {
            trataErroSincronizacao(jqXHR, exception);
            return false;
        }

    });   
}