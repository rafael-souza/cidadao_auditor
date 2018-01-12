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

var cidadesContratadas = ['FORMIGA'];
var urlSync = "";
var urlSyncFormiga = 'http://192.168.0.104:8080/cidadao_auditor/soa/service/mobile.';
//var urlSyncFormiga = 'http://172.20.10.9:8080/cidadao_auditor/soa/service/mobile.';
var listaOcorrencias = [];
var listaNoticias = [];
var listaPesquisas = [];
var listaOpcaoPesquisa = [];
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
	$('a.backbutton').click(function(){
		parent.history.back();
		return false;
	});
	
	verificaCidadeCidadao();
	
});


$$('.open-login').on('click', function () {
	myApp.popup('.popup-login');
	verificaCidadeCidadao();
});

/**
*
*/
function verificaCidadeCidadao(){
	// verificando se a cidade do cidadão possui contrato
	if (window.localStorage.getItem("cidade") == "" || window.localStorage.getItem("cidade") == undefined){
		if ( navigator.geolocation ) {      
			function successInit(pos) {
				latitude = pos.coords.latitude;
				longitude = pos.coords.longitude;
				// pegando o endereço            
				var latlng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
				var geocoder = new google.maps.Geocoder();
				geocoder.geocode({
					'latLng': latlng
				}, function(results, status) {
					var city = results[0].address_components[2].short_name;
						
					// verificando se a cidade do cidadão possui o APP contratado
					if (verificaCidadeContratada(city)){		
						myApp.hideIndicator();
						window.localStorage.setItem("cidade", city.toUpperCase());
					} else {
						myApp.hideIndicator();
						myApp.alert("Sua cidade ainda não possui o Cidadão Auditor! \n Solicite uma visita de um de nossos representantes a sua cidade, acesse o site www.cidadaoauditorapp.com.br e entre em contato!", "Atenção!");
					}	
				});                       
			}
			function failInit(error) {        
				myApp.hideIndicator();			
				myApp.alert('Não foi possível pegar sua posição através do GPS!\n' +
				'Código: ' + error.code + '\n' +
				'Mensagem: ' + error.message, 'Atenção!');
			}
			// Find the users current position.  Cache the location for 5 minutes, timeout after 6 seconds
			navigator.geolocation.getCurrentPosition(successInit, failInit, {maximumAge: 500000, enableHighAccuracy:true, timeout: 10000});
		} else {
			myApp.hideIndicator();			
			myApp.alert('Verifique se sua internet e seu GPS estão ativados!', 'Atenção!');
		}	
	}
	
}

/**
* Verifica se a cidade do cidadão possui contrato
*/
function verificaCidadeContratada(cidade){
	if (cidade != null && cidadesContratadas.indexOf(cidade.toUpperCase()) != -1){
		return true;
	} else {
		return false;
	}
}

/**
* 
*/
function getUrlSync(){
	var cidade = window.localStorage.getItem("cidade");
	
	if (cidade == "FORMIGA"){
		return urlSyncFormiga;
	} 
}	

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
		
		// colocando a legenda
		var iconBase = 'http://maps.google.com/mapfiles/ms/micons/';
        var icons = {
          em_aberto: {
            name: 'Em Aberto',
            icon: iconBase + 'red-dot.png'
          },
          encaminhada: {
            name: 'Encaminhada',
            icon: iconBase + 'blue-dot.png'
          },
          em_analise: {
            name: 'Em Análise',
            icon: iconBase + 'yellow-dot.png'
          },
		  concluida: {
            name: 'Concluída',
            icon: iconBase + 'green-dot.png'
          }
        };
	
		var legend = document.getElementById('legend');
        for (var key in icons) {
			var type = icons[key];
			var name = type.name;
			var icon = type.icon;
			var div = document.createElement('div');
			div.innerHTML = '<img src="' + icon + '"> ' + name;
			legend.appendChild(div);
        }

        map.controls[google.maps.ControlPosition.RIGHT_TOP].push(legend);

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

    var urlSyncOcorrencia = getUrlSync() + "tipoOcorrencia?token=" + token + "(" + window.localStorage.getItem("email_usuario")  + ")";
	
	myApp.showIndicator();

    // realiza a chamada no servidor
    $.ajax({
        url: urlSyncOcorrencia,
        type: "GET",
		contentType: "application.mob/json; charset=utf8",
        async: false,
        cache: false,
        timeout: 90000,        
        // retorno de sucesso da chamada
        success: function( data ) {
			if (data.messages != null &&  data.messages.erro != null && data.messages.erro[0] != null){
        		myApp.alert(data.messages.erro[0], "Atenção");
        		myApp.hideIndicator();
        		return false;
        	} else if (data.tipoOcorrencia != null){      
                listaTipoOcorrencias = [];
                // exibindo os marcadores no mapa
                $.each(data.tipoOcorrencia, function(index, tipoOcorrencia) {    
                    listaTipoOcorrencias.push(tipoOcorrencia);                             
                });

                // setando a lista de tipos de ocorrencia no localstorage
                window.localStorage.setItem("tipoOcorrencias", listaTipoOcorrencias);
				
				myApp.hideIndicator();
				
            } else {
                // retornando que não encotrou a pessoa
                myApp.hideIndicator();
				data = $.parseJSON(data);
                exibeErroSincronizar(data);
                return;          
            }
        },

        // retorno de erro da chamada
        error: function(jqXHR, exception) {
			myApp.hideIndicator();
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
	if (window.localStorage.getItem("email_usuario") == "" || window.localStorage.getItem("email_usuario") == undefined){
		return false;
	}

    // gerando o token para o acesso ao servidor
    token = gerarTokenSync(window.localStorage.getItem("email_usuario"), window.localStorage.getItem("senha_usuario"));

    var urlSyncOcorrencia = getUrlSync() + "ocorrencia?token=" + token + "(" + window.localStorage.getItem("email_usuario") + ")";
	
	myApp.showIndicator();

    // realiza a chamada no servidor
    $.ajax({
        url: urlSyncOcorrencia,
        type: "GET",
		contentType: "application.mob/json; charset=utf8",
        async: false,
        cache: false,
        timeout: 90000,        
        // retorno de sucesso da chamada
        success: function( data ) {
            listaOcorrencias = [];
			
			if (data.messages != null &&  data.messages.erro != null && data.messages.erro[0] != null){
        		myApp.alert(data.messages.erro[0], "Atenção");
        		myApp.hideIndicator();
        		return false;
        	} else if (data.ocorrencia != null){   			
                // exibindo os marcadores no mapa
                $.each(data.ocorrencia, function(index, ocorrencia) {    
                    listaOcorrencias.push(ocorrencia);                                                  
                });

				if (colocarMarcadores){
					colocaMarcadoresMapa(); 
				}
				
				myApp.hideIndicator();
                
            } else {
                // retornando que ouve um erro
				myApp.hideIndicator();
                data = $.parseJSON(data);
                exibeErroSincronizar(data);
                return;          
            }
        },

        // retorno de erro da chamada
        error: function(jqXHR, exception) {
			myApp.hideIndicator();
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


// listando as pesquisas da cidade
$$(document).on('pageInit', '.page[data-page="pesquisa"]', function (e) {
	
	// verificando se possui email e senha cadastrados
	if (window.localStorage.getItem("email_usuario") == "" || window.localStorage.getItem("email_usuario") == undefined){
		$("#descPesquisa").text("Você precisa estar logado para visualizar as pesquisas da sua cidade");
		return false;
	}

    // gerando o token para o acesso ao servidor
    token = gerarTokenSync(window.localStorage.getItem("email_usuario"), window.localStorage.getItem("senha_usuario"));

    var urlSyncPesquisa = getUrlSync() + "pesquisa?token=" + token + "(" + window.localStorage.getItem("email_usuario") + ")";
	
	myApp.showIndicator();

    // realiza a chamada no servidor
    $.ajax({
        url: urlSyncPesquisa,
        type: "GET",
		contentType: "application.mob/json; charset=utf8",
        async: false,
        cache: false,
        timeout: 90000,        
        // retorno de sucesso da chamada
        success: function( data ) {
            listaPesquisas = [];
			
			if (data.messages != null &&  data.messages.erro != null && data.messages.erro[0] != null){
        		myApp.alert(data.messages.erro[0], "Atenção");
        		myApp.hideIndicator();
        		return false;
        	} else if (data.pesquisa != null){   			
                
				// exibindo as noticias na tela
                $.each(data.pesquisa, function(index, pesquisa) {    
                    listaPesquisas.push(pesquisa);                                                  
                });
				
				montaListagemPesquisas();
				
            } else {
                // retornando que ouve um erro
				myApp.hideIndicator();
                data = $.parseJSON(data);
                exibeErroSincronizar(data);
                return;          
            }
        },

        // retorno de erro da chamada
        error: function(jqXHR, exception) {
			myApp.hideIndicator();
            trataErroSincronizacao(jqXHR, exception);
            return;
        }
    });   
});

// Realiza a montagem da listagem das pesquisas da cidade
function montaListagemPesquisas(){

	// limpando a variavel que controla a visualização das pesquisas 
	window.localStorage.setItem("id_pesquisa", "");
	
	$('#listaPesquisas li').remove('li');
	
	var listaPesquisasCidade = $("#listaPesquisas");
    var lista = '';

    if (listaPesquisas.length > 0) {	
		// listando todas as pesquias da cidade
        for (var i = 0; i < listaPesquisas.length; i++) {
			if (listaPesquisas[i] != null){
				var pesquisa = listaPesquisas[i]; 
				lista = lista + '<li class="swipeout"> <div class="swipeout-content item-content"> <div class="post_entry"><div class="post_date">';
				lista = lista + '<span class="day">'+ pesquisa.dataPesquisa.substring(0,2) + '</span>';
				lista = lista + '<div class="pr-aling-date"><span class="month">'+ getMesOcorrencia(pesquisa.dataPesquisa.substring(5,3)) + '</span></br>',
				lista = lista + '<span class="year">'+ pesquisa.dataPesquisa.substring(10,6) + '</span></div></div>';
				lista = lista + '<div class="post_title pr-blog-noticia">';
				lista = lista + '<a href="#" onclick="visualizarPesquisa('+pesquisa.id+')">'
				lista = lista + '<h1>' + pesquisa.descricao + '</h1></div></div></li>';
			}
        }
		listaPesquisasCidade.append(lista);
    } else if (window.localStorage.getItem("email_usuario") == "" || window.localStorage.getItem("email_usuario") == undefined){
		// caso não esteja logado exibe a mensgem informando que é necessário estar logado
		$("#descNoticia").text("Você precisa estar logado para visualizar as pesquisas da sua cidade");
	}
	
	myApp.hideIndicator();
	
}

/**
* realiza a visualização da pesquisa que o usuario selecionou
*/
function visualizarPesquisa(id_pesquisa){
	window.localStorage.setItem("id_pesquisa", id_pesquisa);
	mainView.router.loadPage("pesquisaDetalhe.html");
}


/**
* Evento de exibição da pagina de visualização de uma pesquisa
*/ 
$$(document).on('pageInit', '.page[data-page="pesquisaDetalhe"]', function (e) {
	
	
	$('#graficoResultado').hide();
	
	// pegando o id da ocorrencia que deseja visualizarv
	var id = window.localStorage.getItem("id_pesquisa");
	
	var pesquisa;
	
	//buscando pela pesquisa na lista
	for (var i = 0; i < listaPesquisas.length; i++) {
		// verificando se é a ocorrencia desejada
		if (listaPesquisas[i].id == id){
			pesquisa = listaPesquisas[i];
			break;
		}
	}
	
	// exibindo os dados da pesquisa na tela
	$('.id_pesquisa').text(pesquisa.id);
	$('.pr-titulo-pesquisa').text(pesquisa.descricao);
	$('.pr-data-pesquisa').text(pesquisa.dataPesquisa);
	
	// montando a lista das opções da pesquisa
    token = gerarTokenSync(window.localStorage.getItem("email_usuario"), 
        window.localStorage.getItem("senha_usuario"));    

    // gerando a url de envio dos dados
    var urlSyncOpcao = getUrlSync() + "pesquisaOpcao?token=" + token + "(" + window.localStorage.getItem("email_usuario") + ")";
	urlSyncOpcao = urlSyncOpcao + "pesquisa=" + pesquisa.id;
	
    var pesquisaOpcao = new Object();
	var pesquisaObj = new Object();
	
	pesquisaObj.id = pesquisa.id;
	pesquisaOpcao.pesquisa = pesquisaObj;
	
    // transformando o objeto em uma string json
    var obj = JSON.stringify({ pesquisaOpcao: pesquisaOpcao });            
	
	myApp.showIndicator();

    // enviando os dados
    $.ajax({
        url: urlSyncOpcao,
        type: "GET",
        contentType: "application.mob/json; charset=utf8",
        data: obj,
        async: false,
        dataType: "json",        
        success: function (data) { 
		
			listaOpcaoPesquisa = [];
		
			if (data.messages != null &&  data.messages.erro != null && data.messages.erro[0] != null){
        		myApp.alert(data.messages.erro[0], "Atenção");
        		myApp.hideIndicator();
        		return false;
        	} else if (data.pesquisaOpcao != null){
				// percorrendo as opções de pesquisa
				var listaOpcoes = $("#listaOpcaoPesquisa");
				var lista = '';
				var checked = false;
				// exibindo os comentarios na tela
                $.each(data.pesquisaOpcao, function(index, pesquisaOpcao) {
					lista = lista + '<li><label class="item-radio item-content">';
					if (!checked){
						lista = lista + '<input type="radio" name="opcao-radio" value="' + pesquisaOpcao.id + '" checked />';
						checked = true;
					} else {
						lista = lista + '<input type="radio" name="opcao-radio" value="' + pesquisaOpcao.id + '"/>';
					}
					lista = lista + '<i class="icon icon-radio"></i> <div class="item-inner"> ';
					lista = lista + '<div class="item-title"> ' + pesquisaOpcao.descricao + ' </div></div></label></li>';
					
					listaOpcaoPesquisa.push(pesquisaOpcao);
				});
				
				listaOpcoes.append(lista);	
			}

			myApp.hideIndicator();
        },
        
        // retorno de erro da chamada
        error: function(jqXHR, exception) {
			myApp.hideIndicator();
            trataErroSincronizacao(jqXHR, exception);
            return false;
        }

    });
	
});

/*
* realiza o envio da opção de pesquisa do usuário
*/
function enviarOpcaoPesquisa(){
	if (window.localStorage.getItem("email_usuario") == null){
		myApp.alert("Você precisa estar logado para enviar sua opinião na pesquisa.", "Atenção!");
		return false;
	}

    // gerando o token para o acesso ao servidor
    token = gerarTokenSync(window.localStorage.getItem("email_usuario"), 
        window.localStorage.getItem("senha_usuario"));    
		
		// pegando o valor que o usuário selecionou
	var idSelecionado = $("input:radio[name ='opcao-radio']:checked").val();

    // gerando a url de envio dos dados
    var urlSyncOpiniao = getUrlSync() + "pesquisaOpcao?token=" + token + "(" + window.localStorage.getItem("email_usuario") + ")";
	urlSyncOpiniao = urlSyncOpiniao + "votar=" + idSelecionado;

	// variavel que irá atualizar o valor de votos
	var pesquisaOpcao = new Object();
	
	// percorrendo a listagem para aumentar o numero de votos
	for (var i = 0; i < listaOpcaoPesquisa.length; i++) {
		var obj = listaOpcaoPesquisa[i];	
		if (obj.id == idSelecionado){
			pesquisaOpcao = obj;
			break;
		}			
	}

    // transformando o objeto em uma string json
    var obj = JSON.stringify({ pesquisaOpcao: pesquisaOpcao });            
	
	myApp.showIndicator();
    // enviando os dados
    $.ajax({
        url: urlSyncOpiniao,
        type: "GET",
        contentType: "application.mob/json; charset=utf8",
        data: obj,
        //async: false,
        dataType: "json",        
        success: function (data) { 
		
			if (data.messages != null &&  data.messages.erro != null && data.messages.erro[0] != null){
        		myApp.alert(data.messages.erro[0], "Atenção");
        		myApp.hideIndicator();
        		return false;
        	} else if (data.pesquisaOpcao != null){
				myApp.alert("Dados enviados com sucesso, obrigado por participar da nossa pesquisa!", "Atenção");
				myApp.hideIndicator();
				resultadoPesquisa();
			}
			
        },
        
        // retorno de erro da chamada
        error: function(jqXHR, exception) {
			myApp.hideIndicator();
            trataErroSincronizacao(jqXHR, exception);
            return false;
        }

    }); 
	
}

/*
* mostra o resultado da pesquisa ao usuário
*/
function resultadoPesquisa(){
	
	// armazena o total de votos
	var total = 0;
	
	// percorrendo a listagem para somar o numero de votos
	for (var i = 0; i < listaOpcaoPesquisa.length; i++) {
		var votos = listaOpcaoPesquisa[i].votos
		total = parseInt(total) + parseInt(votos);
	}
	
	var listaResultado = $("#resultadoPesquisa");
	var lista = '';
	// achando o percentual de cada opção
	for (var i = 0; i < listaOpcaoPesquisa.length; i++) {
		var opcao = listaOpcaoPesquisa[i];
		var percentual = (parseInt(opcao.votos) * 100) / parseInt(total);
		
		lista = lista + '<li><div class="item-title item-label">'+opcao.descricao+'</div>';
		lista = lista + '<div id="' + opcao.id + '" class="progressbar ' + getColor(i) + '" data-progress="' + percentual + '"></div></li>'
	}
	
	listaResultado.append(lista);
	
	$('#dadosPesquisa').hide();
	$('#graficoResultado').show();

	for (var i = 0; i < listaOpcaoPesquisa.length; i++) {
		var opcao = listaOpcaoPesquisa[i];
		var id = '#' + opcao.id;
		var progress = $(id).attr('data-progress');
		myApp.progressbar.set(id, progress);
	}
	
}

function getColor(i){
	
	if (i == 0){
		return 'color-blue';
	} else if (i == 1){
		return 'color-red';
	} else if (i == 2){
		return 'color-pink';
	} else if (i == 3){
		return 'color-green';
	} else if (i == 4){
		return 'color-yellow';
	} else if (i == 5){
		return 'color-orange';
	} else {
		return 'color-black';
	}
}


/*
	google.charts.load("current", {packages:["corechart"]});
	google.charts.setOnLoadCallback(exibeResultadoPesquisa);
}

function exibeResultadoPesquisa(){
	
	var dataTable = new google.visualization.DataTable();
	
	dataTable.addColumn('string', 'Opção');
    dataTable.addColumn('number', 'Votos');
	
	// achando o percentual de cada opção
	for (var i = 0; i < listaOpcaoPesquisa.length; i++) {
		var opcao = listaOpcaoPesquisa[i];
		dataTable.addRow([{ v: opcao.descricao }, { v: parseInt(opcao.votos) }]);
	}
	
	var dataSummary = google.visualization.data.group(
		dataTable,
		[0],
		[{'column': 1, 'aggregation': google.visualization.data.sum, 'type': 'number'}]
	);
	
	var options = {
        title: $('.pr-titulo-pesquisa').text()
    };

	var chart = new google.visualization.PieChart(document.getElementById('resultadoPesquisa'));
    //var chart = new google.visualization.BarChart(document.getElementById('resultadoPesquisa'));
	

    chart.draw(dataSummary, options);
	$('#dadosPesquisa').hide();
	$('#graficoResultado').show();
	
	/*	
	
		
	
	
    var options = {
        title: $('.pr-titulo-pesquisa').text(),
		is3D: true,
    };

    var chart = new google.visualization.PieChart(document.getElementById('donutchart'));
	// calculando o total de votos
	var total = 0;
	
	// percorrendo a listagem para aumentar o numero de votos
	for (var i = 0; i < listaOpcaoPesquisa.length; i++) {
		var votos = listaOpcaoPesquisa[i].votos
		total = parseInt(total) + parseInt(votos);
	}
	
	var chartData = [];
	// achando o percentual de cada opção
	for (var i = 0; i < listaOpcaoPesquisa.length; i++) {
		var opcao = listaOpcaoPesquisa[i];
		var obj = new Object();
		obj.y = (parseInt(opcao.votos) * 100) / parseInt(total);
		obj.label = opcao.descricao;
		
		chartData.push(obj);
	}
	
	var chart = new CanvasJS.Chart("resultadoPesquisa", {
		animationEnabled: false,
		title: {text: $('.pr-titulo-pesquisa').text()},
		data: [{
			type: "pie",
			startAngle: 240,
			yValueFormatString: "##0.00'%'",
			indexLabel: "{label} {y}",
			dataPoints: chartData }]
	});
	chart.render();
	$('.canvasjs-chart-credit').hide();
}
*/

// listando as noticias da cidade
$$(document).on('pageInit', '.page[data-page="noticia"]', function (e) {
	
	// verificando se possui email e senha cadastrados
	if (window.localStorage.getItem("email_usuario") == "" || window.localStorage.getItem("email_usuario") == undefined){
		// caso não esteja logado exibe a mensgem informando que é necessário estar logado
		$("#descNoticia").text("Você precisa estar logado para visualizar as notícias da sua cidade");
		return false;
	}

    // gerando o token para o acesso ao servidor
    token = gerarTokenSync(window.localStorage.getItem("email_usuario"), window.localStorage.getItem("senha_usuario"));

    var urlSyncNoticia = getUrlSync() + "noticia?token=" + token + "(" + window.localStorage.getItem("email_usuario") + ")";
	
	myApp.showIndicator();

    // realiza a chamada no servidor
    $.ajax({
        url: urlSyncNoticia,
        type: "GET",
		contentType: "application.mob/json; charset=utf8",
        async: false,
        cache: false,
        timeout: 90000,        
        // retorno de sucesso da chamada
        success: function( data ) {
            listaNoticias = [];
			
			if (data.messages != null &&  data.messages.erro != null && data.messages.erro[0] != null){
        		myApp.alert(data.messages.erro[0], "Atenção");
        		myApp.hideIndicator();
        		return false;
        	} else if (data.noticia != null){   			
                
				// exibindo as noticias na tela
                $.each(data.noticia, function(index, noticia) {    
                    listaNoticias.push(noticia);                                                  
                });
				
				montaListagemNoticias();
				
            } else {
                // retornando que ouve um erro
				myApp.hideIndicator();
                data = $.parseJSON(data);
                exibeErroSincronizar(data);
                return;          
            }
        },

        // retorno de erro da chamada
        error: function(jqXHR, exception) {
			myApp.hideIndicator();
            trataErroSincronizacao(jqXHR, exception);
            return;
        }
    });   
});

// Realiza a montagem da listagem das ultimas noticias da cidade
function montaListagemNoticias(){

	// limpando a variavel que controla a visualização das noticias 
	window.localStorage.setItem("id_noticia", "");
	
	$('#listaNoticias li').remove('li');
	
	var listaNoticiasCidade = $("#listaNoticias");
    var lista = '';

    if (listaNoticias.length > 0) {	
		// listando todas as ocorrências fetias pelo usuário
        for (var i = 0; i < listaNoticias.length; i++) {
			if (listaNoticias[i] != null){
				var noticia = listaNoticias[i]; 
				lista = lista + '<li class="swipeout"> <div class="swipeout-content item-content"> <div class="post_entry"><div class="post_date">';
				lista = lista + '<span class="day">'+ noticia.dataNoticia.substring(0,2) + '</span>';
				lista = lista + '<div class="pr-aling-date"><span class="month">'+ getMesOcorrencia(noticia.dataNoticia.substring(5,3)) + '</span></br>',
				lista = lista + '<span class="year">'+ noticia.dataNoticia.substring(10,6) + '</span></div></div>';
				lista = lista + '<div class="post_title pr-blog-noticia">';
				lista = lista + '<a href="#" onclick="visualizarNoticia('+noticia.id+')">'
				lista = lista + '<h1>' + noticia.titulo + '</h1>';
				lista = lista + '<h2>' + noticia.subtitulo + '</h2></div></div></li>';
			}
        }
		listaNoticiasCidade.append(lista);
    } else if (window.localStorage.getItem("email_usuario") == "" || window.localStorage.getItem("email_usuario") == undefined){
		// caso não esteja logado exibe a mensgem informando que é necessário estar logado
		$("#descNoticia").text("Você precisa estar logado para visualizar as notícias da sua cidade");
	}
	
	myApp.hideIndicator();
	
}



/**
* Clique na lista de ocorrencias para visualizar uma determinada noticia
*/
function visualizarNoticia(id_noticia){
	window.localStorage.setItem("id_noticia", id_noticia);
	mainView.router.loadPage("noticiaDetalhe.html");
}

/**
* Evento de exibição da pagina de visualização de uma noticia
*/ 
$$(document).on('pageInit', '.page[data-page="noticiaDetalhe"]', function (e) {
	// pegando o id da noticia que deseja visualizar
	var id = window.localStorage.getItem("id_noticia");
	
	var noticia;
	
	//buscando pela ocorrencia na lista
	for (var i = 0; i < listaNoticias.length; i++) {
		// verificando se é a ocorrencia desejada
		if (listaNoticias[i].id == id){
			noticia = listaNoticias[i];
			break;
		}
	}
	
	// pegando os campos da tela e setando os valores desejados
	//$('.id_ocorrencia').text(ocorrencia.id);
	$('.tituloNoticia').text(noticia.titulo);
	$('.subtituloNoticia').text(noticia.subtitulo);
	$('.autorDataNoticia').text(noticia.dataNoticia + " - Por: " + noticia.autor);
	$('.descricaoNoticia').append(noticia.descricao);
	
});




// listando os imoveis de trabalho
$$(document).on('pageInit', '.page[data-page="ocorrencia"]', function (e) {
	// limpando a variavel que controla a visualização das ocorrencias
	window.localStorage.setItem("id_ocorrencia", "");
	
   montaListagemOcorrencias();

});

function montaListagemOcorrencias(){
	$('#listaMinhasOcorrencias li').remove('li');
	var listaMinhasOcorrencias = $("#listaMinhasOcorrencias");
    var lista = '';

    if (listaOcorrencias.length > 0) {	
		// listando todas as ocorrências fetias pelo usuário
        for (var i = 0; i < listaOcorrencias.length; i++) {
			if (listaOcorrencias[i] != null){
				var ocorrencia = listaOcorrencias[i]; 
				lista = lista + '<li class="swipeout"> <div class="swipeout-content item-content"> <div class="post_entry"><div class="post_date">';
				lista = lista + '<span class="day">'+ ocorrencia.dataOcorrencia.substring(0,2) + '</span>';
				lista = lista + '<div class="pr-aling-date"><span class="month">'+ getMesOcorrencia(ocorrencia.dataOcorrencia.substring(5,3)) + '</span></br>';
				lista = lista + '<span class="year">'+ ocorrencia.dataOcorrencia.substring(10,6) + '</span></div></div>';
				lista = lista + '<div class="post_title">';
				lista = lista + '<a href="#" onclick="visualizarOcorrencia('+ocorrencia.id+')">'
				lista = lista + 'Tipo: ' + ocorrencia.descricaoTipo + '</br>';
				lista = lista + 'Endereço: ' + ocorrencia.endereco + '</br>';
				lista = lista + 'Status: ' + ocorrencia.statusOcorrencia.lookup + '</a></h2> </div>';
				lista = lista + '<div class="post_swipe"><img src="images/swipe_more.png" alt="" title="" /></div>';
				lista = lista + '</div></div>';
				lista = lista + '<div class="swipeout-actions-right">';
				lista = lista + '<a href="#" class="action1" onclick="visualizarOcorrencia('+ocorrencia.id+')"> <img src="images/icons/white/message.png" alt="" title="" /></a>';
				lista = lista + '<a href="#" class="action2" onclick="removerOcorrencia('+ocorrencia.id+')"> <img src="images/icons/white/remover.png" alt="" title="" /></a>';
				lista = lista + '</div></li>';
			}
        }
		listaMinhasOcorrencias.append(lista);
    } else if (window.localStorage.getItem("email_usuario") == "" || window.localStorage.getItem("email_usuario") == undefined){
		// caso não esteja logado exibe a mensgem informando que é necessário estar logado
		$("#descOcorrencia").text("Você precisa estar logado para visualizar suas ocorrências");
	}
	
}

function removerOcorrencia(id_ocorrencia){
	myApp.confirm('Tem certeza que deseja remover essa ocorrência?', 'Atenção!', function () {
		// verificando o status da ocorrencia para saber se pode ser removida
		var ocorrencia;
		var i;
		//buscando pela ocorrencia na lista
		for (i = 0; i < listaOcorrencias.length; i++) {
			if (listaOcorrencias[i] != null && listaOcorrencias[i].id == id_ocorrencia){
				ocorrencia = listaOcorrencias[i];
				break;
			}
		}
		
		if (ocorrencia.statusOcorrencia.lookup != 'Em Aberto' ){
			myApp.alert("Somente podem ser excluídas ocorrências Em Aberto!", "Atenção!");
			return false;
		}
		
		// montando os dados para remoção da ocorrência
		// gerando a url de remoção dos dados
		var urlSyncDeleteOcorrencia = getUrlSync() + "ocorrenciaman("+ id_ocorrencia +")";
		urlSyncDeleteOcorrencia = urlSyncDeleteOcorrencia.replace("mobile.","");
		
		myApp.showIndicator();
		
		// enviando os dados
		$.ajax({
			url: urlSyncDeleteOcorrencia,
			type: "DELETE",
			//contentType: 'application.mob/json; charset=utf8',
			async: false,
			//dataType: 'json',        
			success: function (data) { 

				if (data.messages != null &&  data.messages.erro != null && data.messages.erro[0] != null){
					myApp.alert(data.messages.erro[0], "Atenção");
					myApp.hideIndicator();
					return false;
				}
				// removendo a ocorrencia da listagem
				delete listaOcorrencias[i];
				
				montaListagemOcorrencias();
				
				myApp.hideIndicator();
				
				myApp.alert("Ocorrência removida com sucesso.", "Atenção!");
				
			},
			
			// retorno de erro da chamada
			error: function(jqXHR, exception) {
				trataErroSincronizacao(jqXHR, exception);
				return false;
			}

		});
	});
}

/**
* Clique na lista de ocorrencias para visualizar uma determinada ocorrencia
*/
function visualizarOcorrencia(id_ocorrencia){
	window.localStorage.setItem("id_ocorrencia", id_ocorrencia);
	mainView.router.loadPage("ocorrenciaDetalhe.html");
}

/**
* Evento de exibição da pagina de visualização de uma ocorrencia
*/ 
$$(document).on('pageInit', '.page[data-page="ocorrenciaDetalhe"]', function (e) {
	// pegando o id da ocorrencia que deseja visualizarv
	var id = window.localStorage.getItem("id_ocorrencia");
	
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
	
	$('.id_ocorrencia').text(ocorrencia.id);
	$('.tipoOcorrenciaDetalhe').append('<h2>' + ocorrencia.descricaoTipo + '</h2>');
	$('.dataOcorrenciaDetalhe').text(ocorrencia.dataOcorrencia);
	$('.enderecoOcorrenciaDetalhe').text(ocorrencia.endereco);
	$('.statusOcorrenciaDetalhe').text(ocorrencia.statusOcorrencia.lookup);
	$('.observacaoOcorrenciaDetalhe').text(ocorrencia.observacao);
	$('.protocoloOcorrenciaDetalhe').text(ocorrencia.protocolo);
	
	// montando a lista dos comentarios ja realizados pelo usuario e pela prefeitura
    // gerando o token para o acesso ao servidor
    token = gerarTokenSync(window.localStorage.getItem("email_usuario"), 
        window.localStorage.getItem("senha_usuario"));    

    // gerando a url de envio dos dados
    var urlSyncComent = getUrlSync() + "historicoOcorrencia?token=" + token + "(" + window.localStorage.getItem("email_usuario") + ")";
	urlSyncComent = urlSyncComent + "ocorrencia=" + ocorrencia.id;
	
    var historicoOcorrencia = new Object();
	var ocorrenciaHistorico = new Object();
	
	ocorrenciaHistorico.id = ocorrencia.id;
	historicoOcorrencia.ocorrencia = ocorrenciaHistorico;
	
    // transformando o objeto em uma string json
    var obj = JSON.stringify({ historicoOcorrencia: historicoOcorrencia });            
	
	myApp.showIndicator();

    // enviando os dados
    $.ajax({
        url: urlSyncComent,
        type: "GET",
        contentType: "application.mob/json; charset=utf8",
        data: obj,
        async: false,
        dataType: "json",        
        success: function (data) { 
		
			if (data.messages != null &&  data.messages.erro != null && data.messages.erro[0] != null){
        		myApp.alert(data.messages.erro[0], "Atenção");
        		myApp.hideIndicator();
        		return false;
        	} else if (data.historicoOcorrencia != null){
				// percorrendo o historio das ocorrencias para listagem na tela
				var listaComentarios = $("#listaComentarios");
				var lista = '';
				
				// exibindo os comentarios na tela
                $.each(data.historicoOcorrencia, function(index, historicoOcorrencia) {    
                
					lista = lista + '<li class="comment_row">';
					lista = lista + '<div class="comm_avatar"><img src="images/icons/black/user.png" alt="" title="" border="0" /></div>';
					lista = lista + '<div class="comm_content"><p><b>Data: </b>' + historicoOcorrencia.dataHistorico + '<br/>';
					lista = lista + '<b>Descrição: </b>' + historicoOcorrencia.observacao + '<br/>';
					lista = lista + '<b>Responsável: </b><a href="#">' + historicoOcorrencia.responsavel + '</a></p></div></li>';
				});
				
				listaComentarios.append(lista);	
			}

			myApp.hideIndicator();
        },
        
        // retorno de erro da chamada
        error: function(jqXHR, exception) {
			myApp.hideIndicator();
            trataErroSincronizacao(jqXHR, exception);
            return false;
        }

    });
	
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
	$('#fotoOcorrencia').empty();
    $('#fotoOcorrencia').append('<img src="images/nenhuma_foto.png" />');       
		
	var inseriuGroup = false;
	var optGroup = 0;
	var nomeGroup = '';
	var lista = '';
    // inserindo os valores dos tipos de ocorrencia
    for (var i = 0; i < listaTipoOcorrencias.length; i++){  
		
		// verificando se trocou de secretaria
		if (nomeGroup != '' && nomeGroup != listaTipoOcorrencias[i].secretaria.nome){
			inseriuGroup = false;
			optGroup = optGroup + 1;
			lista = lista + '</optgroup>';
		}

		if (inseriuGroup == false) {
			lista = lista + ' <optgroup label="' + listaTipoOcorrencias[i].secretaria.nome + '">';
			//myApp.smartSelectAddOption('.smart-select select', ' <optgroup label="' + listaTipoOcorrencias[i].secretaria.nome + '"></optgroup>');
			inseriuGroup = true;
			nomeGroup = listaTipoOcorrencias[i].secretaria.nome;
		}
		
		lista = lista + '<option value=' + listaTipoOcorrencias[i].id +'>'+listaTipoOcorrencias[i].descricao +'</option>'

		//myApp.smartSelectAddOption($$('.smart-select select optigroup').eq(optGroup), '<option value=' + listaTipoOcorrencias[i].id +'>'+listaTipoOcorrencias[i].descricao +'</option>');     

		//myApp.smartSelectAddOption('.smart-select select', '<option value=' + listaTipoOcorrencias[i].id +'>'+listaTipoOcorrencias[i].descricao +'</option>');     
    }
	
	myApp.smartSelectAddOption('.smart-select select', lista);
	
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
    //var srcType = Camera.PictureSourceType.SAVEDPHOTOALBUM;
    //var options = setOptions(srcType); PHOTOLIBRARY
    var func = createNewFileEntry;

	navigator.camera.getPicture(capturarSuccess, capturarFail, 
		{ 	quality: 50,
			destinationType: Camera.DestinationType.DATA_URL,
			sourceType : Camera.PictureSourceType.SAVEDPHOTOALBUM}
	);
	
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

/*
* Realiza o login do usuário.
*/
function realizaLogin(){
	
	if ($("#email").val() == "" ){
		myApp.alert("Você deve informar o seu e-mail!", "Atenção!");
		return false;
	}
	
	if ($("#senha").val() == "") {
		myApp.alert("Você deve informar sua senha!", "Atenção!");
		return false;
	}
	
	// verificando se a cidade do cidadão tem nossos serviços contratados
	if (verificaCidadeContratada(window.localStorage.getItem("cidade")) == false){
		myApp.alert("Sua cidade ainda não possui o Cidadão Auditor!\nSolicite uma visita de um de nossos representantes a sua cidade, acesse o site www.cidadaoauditorapp.com.br e entre em contato!", "Atenção!");
		return false;
	}
          
	// gerando o token para o acesso ao servidor
	token = gerarTokenSync($("#email").val(), $("#senha").val());

	var urlSyncPessoa = getUrlSync() + "pessoa?token=" + token + "(" + $("#email").val() + ")";
	
	myApp.showIndicator();

	// realiza a chamada no servidor
	$.ajax({
		url: urlSyncPessoa,
		type: "GET",
		contentType: "application.mob/json; charset=utf8",
		async: false,
		cache: false,
		timeout: 90000,        
		// retorno de sucesso da chamada
		success: function( data ) {
			
			if (data.messages != null &&  data.messages.erro != null && data.messages.erro[0] != null){
        		myApp.alert(data.messages.erro[0], "Atenção");
        		myApp.hideIndicator();
        		return false;
        	} else 	if (data.pessoa != null){                    
				// armazenando os dados                    
				window.localStorage.setItem("email_usuario", data.pessoa[0].email);
				window.localStorage.setItem("senha_usuario", $("#senha").val());
				window.localStorage.setItem("nome_pessoa", data.pessoa[0].nome);
				
				myApp.hideIndicator();
				myApp.closeModal('.popup-login');	
				myApp.closePanel();

			} else {
				// retornando que não encotrou a pessoa
				myApp.hideIndicator();
				data = $.parseJSON(data);
				exibeErroSincronizar(data);
				return;          
			}
		},

		// retorno de erro da chamada
		error: function(jqXHR, exception) {
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
	window.localStorage.removeItem("nome_pessoa");   
	window.localStorage.removeItem("tipoOcorrencias");   
	window.localStorage.removeItem("cidade");  	
	
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
	
	// verificando se a cidade do cidadão tem nossos serviços contratados
	if (verificaCidadeContratada(window.localStorage.getItem("cidade")) == false){
		myApp.alert("Sua cidade ainda não possui o Cidadão Auditor! \n Solicite uma visita de um de nossos representantes a sua cidade, acesse o site www.cidadaoauditorapp.com.br e entre em contato!", "Atenção!");
		return false;
	}

	
  // verificando se informou os dados obrigatorios
    if ($("#nomeCad").val() == ""){    
		myApp.alert("Você deve informar o seu nome completo!", "Atenção!");
        return false;        
    }

    if ($("#emailCad").val() == ""){
		myApp.alert("Você deve informar o seu e-mail!", "Atenção!");
        return false;   
    }

    var emailFilter=/^.+@.+\..{2,}$/;
    var illegalChars= /[\(\)\<\>\,\;\:\\\/\"\[\]]/   
    if(!(emailFilter.test($("#emailCad").val() )) || $("#emailCad").val().match(illegalChars)){
        myApp.alert(
            'Você deve informar um E-mail válido!',
            'Atenção!');       
        return false; 
    }

    if ($("#senhaCad").val() == ""){     
		myApp.alert("Você deve informar a sua senha!", "Atenção!");
        return false;  
    }
	
	if ($("#senhaCad").val() != $("#senhaConfCad").val()){                    
        myApp.alert(
            'A senha digitada não confere com a confirmação!',
            'Atenção!');       
        return false;   
    }
	
    // gerando o token para o acesso ao servidor
    token = gerarTokenSync($("#emailCad").val(), $("#senhaCad").val());    

    // gerando a url de envio dos dados
    var urlSyncPessoaCad = getUrlSync() + "pessoa?token=" + token + "(" + $("#emailCad").val() + ")cadastro";

    var pessoa = new Object();
    pessoa.email = $("#emailCad").val();
    pessoa.senha = $("#senhaCad").val();
    pessoa.nome = $("#nomeCad").val();

    // transformando o objeto em uma string json
    var obj = JSON.stringify({ pessoa: pessoa }); 
			
	myApp.showIndicator();
    // enviando os dados
    $.ajax({
        url: urlSyncPessoaCad,
        type: "POST",
        contentType: "application.mob/json; charset=utf8",
        data: obj,
        //async: false,
        dataType: "json",        
        success: function (data) {
			
			if (data.messages != null &&  data.messages.erro != null && data.messages.erro[0] != null){
				myApp.alert(data.messages.erro[0], "Atenção");
        		myApp.hideIndicator();
        		return false;
        	}
			
			// armazenando os dados                    
			window.localStorage.setItem("email_usuario", data.pessoa.email);
			window.localStorage.setItem("senha_usuario", $("#senhaCad").val());
			window.localStorage.setItem("nome_pessoa", data.pessoa.nome);
			
			$(".user_details p").remove('p')
			$(".user_details").append('<p>Olá, <span>'+ data.pessoa.nome.split(" ")[0] +'</span></p>');
			
			myApp.hideIndicator();
			myApp.closeModal('.popup-signup');
			myApp.closeModal('.popup-login');	
			myApp.closePanel();
        },
        
        // retorno de erro da chamada
        error: function(jqXHR, exception) {
			myApp.hideIndicator();
            trataErroSincronizacao(jqXHR, exception);
            return false;
        }

    });       
}

$$('.panel-left').on('opened', function () {
	if (window.localStorage.getItem("nome_pessoa") != undefined){
	
		if ($(".user_details p").length == 0){
			$(".user_details p").remove('p')
			$(".user_details").append('<p>Olá, <span>'+ window.localStorage.getItem("nome_pessoa").split(" ")[0] +'</span></p>');
		}
	
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
	
	// verificando se a cidade do cidadão tem nossos serviços contratados
	if (verificaCidadeContratada(window.localStorage.getItem("cidade")) == false){
		myApp.alert("Sua cidade ainda não possui o Cidadão Auditor! \n Solicite uma visita de um de nossos representantes a sua cidade, acesse o site www.cidadaoauditorapp.com.br e entre em contato!", "Atenção!");
		return false;
	}

	
	if ($("#tipoOcorrencia option:selected").val() == 0){ 
		myApp.alert("O Tipo da Ocorrência deve ser informado.", "Atenção!");
		return false;
	}
	
	if ($("#observacao").val() == ""){
		myApp.alert("Você deve nos informar o que está acontecendo.", "Atenção!");
		return false;
	}
	
	// verificando se o usuario está logado no sistema
	if (window.localStorage.getItem("email_usuario") == "" || window.localStorage.getItem("email_usuario") == undefined){
		// caso não esteja logado exibe a mensgem informando que é necessário estar logado
		myApp.alert("Você precisa estar logado para enviar suas ocorrências", "Atenção!");
    }
	
	realizaEnvioOcorrencia();
}

function realizaEnvioOcorrencia(){
    // gerando o token para o acesso ao servidor
    token = gerarTokenSync(window.localStorage.getItem("email_usuario"), 
        window.localStorage.getItem("senha_usuario"));    

    // gerando a url de envio dos dados
    var urlSyncOcorrenciaCad = getUrlSync() + "ocorrencia?token=" + token + "(" + window.localStorage.getItem("email_usuario") + ")";

    var ocorrencia = new Object();
    var pessoa = new Object();
  
    pessoa.email = window.localStorage.getItem("email_usuario");
    ocorrencia.pessoa = pessoa;
    ocorrencia.idTipo = $("#tipoOcorrencia option:selected").val();
    ocorrencia.observacao = $("#observacao").val();    
	ocorrencia.fotoApp = $("#fotoOcorrencia").find("img").prop("src");
    ocorrencia.latitude = latitude;
    ocorrencia.longitude = longitude;
	ocorrencia.endereco = $("#endereco").val();

    // transformando o objeto em uma string json
    var obj = JSON.stringify({ ocorrencia: ocorrencia });            
	myApp.showIndicator();
    // enviando os dados
    $.ajax({
        url: urlSyncOcorrenciaCad,
        type: "POST",
        contentType: "application.mob/json; charset=UTF-8",
        data: obj,
        //async: false,
        dataType: "json",      
        success: function (data) {
			
			if (data.messages != null &&  data.messages.erro != null && data.messages.erro[0] != null){
				myApp.alert(data.messages.erro[0], "Atenção");
        		myApp.hideIndicator();
        		return false;
        	}

            // enviando o alerta ao usuário com o numero do protocolo
            myApp.alert(
                'Ocorrência enviada com sucesso!\n' + 
                'PROTOCOLO\n' +
                data.ocorrencia.protocolo,
                'Atenção!'); 
			
			// adicionando na lista local
			listaOcorrencias.push(data.ocorrencia);
			
			myApp.hideIndicator();
            
        },
        
        // retorno de erro da chamada
        error: function(jqXHR, exception) {
			myApp.hideIndicator();
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
	
	// verificando se a cidade do cidadão tem nossos serviços contratados
	if (verificaCidadeContratada(window.localStorage.getItem("cidade")) == false){
		myApp.alert("Sua cidade ainda não possui o Cidadão Auditor! \n Solicite uma visita de um de nossos representantes a sua cidade, acesse o site www.cidadaoauditorapp.com.br e entre em contato!", "Atenção!");
		return false;
	}

	
	if (window.localStorage.getItem("email_usuario") == null){
		myApp.alert("Você precisa estar logado para enviar suas sugestões.", "Atenção!");
		return false;
	}
	
	// verificando se informou os dados obrigatorios
    if ($("#tituloSugestao").val() == ""){       
        myApp.alert("Você deve informar o título da sua sugestão.", "Atenção!");
		return false;        
    }

    if ($("#descricaoSugestao").val() == ""){      
		myApp.alert("Você deve descrever sua sugestão.", "Atenção!");
        return false;  
    }

    // gerando o token para o acesso ao servidor
    token = gerarTokenSync(window.localStorage.getItem("email_usuario"), 
        window.localStorage.getItem("senha_usuario"));    

    // gerando a url de envio dos dados
    var urlSyncSugestao = getUrlSync() + "sugestao?token=" + token + "(" + window.localStorage.getItem("email_usuario") + ")";

    var sugestao = new Object();
    var pessoa = new Object();
    //tipoOcorrencia.descricao = $("#tipoOcorrencia option:selected").text();
    pessoa.email = window.localStorage.getItem("email_usuario");
    sugestao.pessoa = pessoa;
	sugestao.descTipo = $("#tipoSugestao option:selected").val();
	sugestao.titulo = $("#tituloSugestao").val();
	sugestao.endereco = $("#enderecoSugestao").val();
	sugestao.descricao = $("#descricaoSugestao").val();
	
    // transformando o objeto em uma string json
    var obj = JSON.stringify({ sugestao: sugestao }); 
	myApp.showIndicator();	
    // enviando os dados
    $.ajax({
        url: urlSyncSugestao,
        type: "POST",
        contentType: "application.mob/json; charset=utf8",
        data: obj,
        //async: false,
        dataType: "json",        
        success: function (data) { 
			
			if (data.messages != null &&  data.messages.erro != null && data.messages.erro[0] != null){
        		myApp.alert(data.messages.erro[0], "Atenção");
        		myApp.hideIndicator();
        		return false;
        	}
		
            myApp.alert(
                'Sugestão enviada com sucesso!\n' + 
                'PROTOCOLO\n' +
                data.sugestao.protocolo + "\n Guarde o nº do protocolo para consultar o que achamos da sua sugestao!",
                'Atenção!');
				
			myApp.hideIndicator();
				
        },
        
        // retorno de erro da chamada
        error: function(jqXHR, exception) {
			myApp.hideIndicator();
            trataErroSincronizacao(jqXHR, exception);
            return false;
        }

    });      	
	
}

/**
*
*/
function consultarSugestao(){
	
	// verificando se a cidade do cidadão tem nossos serviços contratados
	if (verificaCidadeContratada(window.localStorage.getItem("cidade")) == false){
		myApp.alert("Sua cidade ainda não possui o Cidadão Auditor! \n Solicite uma visita de um de nossos representantes a sua cidade, acesse o site www.cidadaoauditorapp.com.br e entre em contato!", "Atenção!");
		return false;
	}

	
	if (window.localStorage.getItem("email_usuario") == null){
		myApp.alert("Você precisa estar logado para enviar suas sugestões.", "Atenção!");
		return false;
	}
	
	if ($("#numeroProtocoloSugestao").val == ""){
		myApp.alert("Você deve informar o nº do protocolo.", "Atenção!");
		return false;
	}
	
	 // gerando o token para o acesso ao servidor
    token = gerarTokenSync(window.localStorage.getItem("email_usuario"), 
        window.localStorage.getItem("senha_usuario"));    

    // gerando a url de envio dos dados
    var urlSyncConsultaSugestao = getUrlSync() + "sugestao?token=" + token + "(" + window.localStorage.getItem("email_usuario") + ")";
	urlSyncConsultaSugestao = urlSyncConsultaSugestao + "protocolo=" + $("#numeroProtocoloSugestao").val();

    var sugestao = new Object();
	sugestao.protocolo = $("#numeroProtocoloSugestao").val();
	
    // transformando o objeto em uma string json
    var obj = JSON.stringify({ sugestao: sugestao }); 
	myApp.showIndicator();
    // enviando os dados
    $.ajax({
        url: urlSyncConsultaSugestao,
        type: "GET",
        contentType: "application.mob/json; charset=utf8",
        data: obj,
        async: false,
        dataType: "json",        
        success: function (data) { 
			var texto;
			if (data.messages != null &&  data.messages.erro != null && data.messages.erro[0] != null){
        		myApp.alert(data.messages.erro[0], "Atenção");
        		myApp.hideIndicator();
        		return false;
        	} else if (data.sugestao[0].observacao != null) {
				texto =  data.sugestao[0].observacao;
			} else {
				texto = "Sua Sugestão ainda não foi avaliada, por favor aguarde!";
			}
			$("#descricaoConsulta").text(texto);
			myApp.hideIndicator();
			myApp.pickerModal('.picker-info-consulta')
        },
        
        // retorno de erro da chamada
        error: function(jqXHR, exception) {
			myApp.hideIndicator();
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
	
	// verificando se a cidade do cidadão tem nossos serviços contratados
	if (verificaCidadeContratada(window.localStorage.getItem("cidade")) == false){
		myApp.alert("Sua cidade ainda não possui o Cidadão Auditor! \n Solicite uma visita de um de nossos representantes a sua cidade, acesse o site www.cidadaoauditorapp.com.br e entre em contato!", "Atenção!");
		return false;
	}

	
	if (window.localStorage.getItem("email_usuario") == null){
		myApp.alert("Você precisa estar logado para enviar suas denúncias.", "Atenção!");
		return false;
	}
	
	// verificando se informou os dados obrigatorios
    if ($("#tituloDenuncia").val() == ""){  
		myApp.alert("Você deve informar o título da denúncia", "Atenção!");
        return false;        
    }

    if ($("#descricaoDenuncia").val() == ""){
		myApp.alert("Você deve descrever a sua denúncia.", "Atenção!");
        return false;  
    }

    // gerando o token para o acesso ao servidor
    token = gerarTokenSync(window.localStorage.getItem("email_usuario"), 
        window.localStorage.getItem("senha_usuario"));    

    // gerando a url de envio dos dados
    var urlSyncDenuncia = getUrlSync() + "denuncia?token=" + token + "(" + window.localStorage.getItem("email_usuario") + ")";

    var denuncia = new Object();
    var pessoa = new Object();
	
	if ($("#denunciaAnonima").is(":checked") == false){
		pessoa.email = window.localStorage.getItem("email_usuario");
		denuncia.pessoa = pessoa;
	}

	denuncia.titulo = $("#tituloDenuncia").val();
	denuncia.endereco = $("#enderecoDenuncia").val();
	denuncia.descricao = $("#descricaoDenuncia").val();
	myApp.showIndicator();
    // transformando o objeto em uma string json
    var obj = JSON.stringify({ denuncia: denuncia });            
    // enviando os dados
    $.ajax({
        url: urlSyncDenuncia,
        type: "POST",
        contentType: "application.mob/json; charset=utf8",
        data: obj,
        //async: false,
        dataType: "json",        
        success: function (data) { 
            if (data.messages != null &&  data.messages.erro != null && data.messages.erro[0] != null){
        		myApp.alert(data.messages.erro[0],  "Atenção");
        		myApp.hideIndicator();
        		return false;
        	}			
			
			myApp.alert(
                'Denúncia enviada com sucesso!\n' + 
                'PROTOCOLO\n' +
                data.denuncia.protocolo + "\n Guarde o nº do protocolo para consultar o andamento de sua denúncia!",
                'Atenção!');
		
			myApp.hideIndicator();
				
        },
        
        // retorno de erro da chamada
        error: function(jqXHR, exception) {
			myApp.hideIndicator();
            trataErroSincronizacao(jqXHR, exception);
            return false;
        }

    });   
}

/*
*
*/
function consultarDenuncia(){
	
	// verificando se a cidade do cidadão tem nossos serviços contratados
	if (verificaCidadeContratada(window.localStorage.getItem("cidade")) == false){
		myApp.alert("Sua cidade ainda não possui o Cidadão Auditor! \n Solicite uma visita de um de nossos representantes a sua cidade, acesse o site www.cidadaoauditorapp.com.br e entre em contato!", "Atenção!");
		return false;
	}

	
	if (window.localStorage.getItem("email_usuario") == null){
		myApp.alert("Você precisa estar logado para enviar suas sugestões.", "Atenção!");
		return false;
	}
	
	if ($("#numeroProtocoloDenuncia").val == ""){
		myApp.alert("Você deve informar o nº do protocolo.", "Atenção!");
		return false;
	}
	
	 // gerando o token para o acesso ao servidor
    token = gerarTokenSync(window.localStorage.getItem("email_usuario"), 
        window.localStorage.getItem("senha_usuario"));    

    // gerando a url de envio dos dados
    var urlSyncConsultaDenuncia = getUrlSync() + "denuncia?token=" + token + "(" + window.localStorage.getItem("email_usuario") + ")";
	urlSyncConsultaDenuncia = urlSyncConsultaDenuncia + "protocolo=" + $("#numeroProtocoloDenuncia").val();
	
    var denuncia = new Object();
	denuncia.protocolo = $("#numeroProtocoloDenuncia").val();

    // transformando o objeto em uma string json
    var obj = JSON.stringify({ denuncia: denuncia });
	myApp.showIndicator();	
    // enviando os dados
    $.ajax({
        url: urlSyncConsultaDenuncia,
        type: "GET",
        contentType: "application.mob/json; charset=utf8",
        data: obj,
        async: false,
        dataType: "json",        
        success: function (data) { 
			var texto;
			if (data.messages != null &&  data.messages.erro != null && data.messages.erro[0] != null){
        		myApp.alert(data.messages.erro[0], "Atenção");
        		myApp.hideIndicator();
        		return false;
        	} else if (data.denuncia[0].observacao != null) {
				texto = data.denuncia[0].observacao;
			} else {
				texto = "Sua denúncia ainda não foi avaliada, por favor aguarde!";
			}
			
			$("#descricaoConsulta").text(texto);
			myApp.hideIndicator();
			myApp.pickerModal('.picker-info-consulta')
        },
        
        // retorno de erro da chamada
        error: function(jqXHR, exception) {
			myApp.hideIndicator();
            trataErroSincronizacao(jqXHR, exception);
            return false;
        }

    }); 
	
}


/**
* Realiza o envio de um comentário
*/
function enviarComentario(){
	if (window.localStorage.getItem("email_usuario") == null){
		myApp.alert("Você precisa estar logado para enviar um comentário.", "Atenção!");
		return false;
	}
	
	// verificando se informou os dados obrigatorios
    if ($("#comentario").val() == ""){  
		myApp.alert("Você deve informar o seu comentário", "Atenção!");
        return false;        
    }

    // gerando o token para o acesso ao servidor
    token = gerarTokenSync(window.localStorage.getItem("email_usuario"), 
        window.localStorage.getItem("senha_usuario"));    

    // gerando a url de envio dos dados
    var urlSyncComent = getUrlSync() + "historicoOcorrencia?token=" + token + "(" + window.localStorage.getItem("email_usuario") + ")";

    var historicoOcorrencia = new Object();
	var ocorrencia = new Object();
	historicoOcorrencia.ocorrencia = ocorrencia;
	historicoOcorrencia.idOcorrencia = $('.id_ocorrencia').text()
	historicoOcorrencia.observacao = $("#comentario").val();
	historicoOcorrencia.responsavel = window.localStorage.getItem("nome_pessoa");
	
    // transformando o objeto em uma string json
    var obj = JSON.stringify({ historicoOcorrencia: historicoOcorrencia });            
	
	myApp.showIndicator();
    // enviando os dados
    $.ajax({
        url: urlSyncComent,
        type: "POST",
        contentType: "application.mob/json; charset=utf8",
        data: obj,
        //async: false,
        dataType: "json",        
        success: function (data) { 
		
			if (data.messages != null &&  data.messages.erro != null && data.messages.erro[0] != null){
        		myApp.alert(data.messages.erro[0], "Atenção");
        		myApp.hideIndicator();
        		return false;
        	} else if (data.historicoOcorrencia != null){
			   
				// colocando o comentario na listagem
				var listaComentarios = $("#listaComentarios");
				var lista = '';
					
				// exibindo os comentarios na tela
				lista = lista + '<li class="comment_row">';
				lista = lista + '<div class="comm_avatar"><img src="images/icons/black/user.png" alt="" title="" border="0" /></div>';
				lista = lista + '<div class="comm_content"><p><b>Data: </b>' + data.historicoOcorrencia.dataHistorico + '<br/>';
				lista = lista + '<b>Descrição: </b>' + data.historicoOcorrencia.observacao + '<br/>';
				lista = lista + '<b>Responsável: </b><a href="#">' + data.historicoOcorrencia.responsavel + '</a></p></div></li>';
				listaComentarios.append(lista);	
				
				myApp.hideIndicator();
				
				myApp.alert(
					'Comentário enviado com sucesso!',
					'Atenção!');
			}
			
        },
        
        // retorno de erro da chamada
        error: function(jqXHR, exception) {
			myApp.hideIndicator();
            trataErroSincronizacao(jqXHR, exception);
            return false;
        }

    });   	
	
}


function enviarNovaSenha(){
	
    // verificando se a cidade do cidadão tem nossos serviços contratados
	if (verificaCidadeContratada(window.localStorage.getItem("cidade")) == false){
		myApp.alert("Sua cidade ainda não possui o Cidadão Auditor! \n Solicite uma visita de um de nossos representantes a sua cidade, acesse o site www.cidadaoauditorapp.com.br e entre em contato!", "Atenção!");
		return false;
	}
	
	if ($("#emailNovaSenha").val() == ""){
		myApp.alert("Você deve informar o seu e-mail de cadastro.", "Atenção!");
		return false;
	}
	
	 // gerando um token ficticio
    token = gerarTokenSync($("#emailNovaSenha").val(), "123");    

    // gerando a url de envio dos dados
    var urlSyncNovaSenha = getUrlSync() + "pessoa?token=" + token + "(" + $("#emailNovaSenha").val() + ")";
	urlSyncNovaSenha = urlSyncNovaSenha + "recuperar";
	
    var pessoa = new Object();
	pessoa.email = $("#emailNovaSenha").val();

    // transformando o objeto em uma string json
    var obj = JSON.stringify({ pessoa: pessoa });   
	myApp.showIndicator();	
    // enviando os dados
    $.ajax({
        url: urlSyncNovaSenha,
        type: "GET",
        contentType: "application.mob/json; charset=utf8",
        data: obj,
        async: false,
        dataType: "json",        
        success: function (data) { 
		    if (data.messages != null && data.messages.erro != null && data.messages.erro[0] != null){
        		myApp.alert("Desculpe, mas o e-mail informado não foi encontrado!", "Atenção");
        		myApp.hideIndicator();
        		return false;
        	}
			realizaAlteracaoSenha(data.pessoa[0]);
			
        },
        
        // retorno de erro da chamada
        error: function(jqXHR, exception) {
            trataErroSincronizacao(jqXHR, exception);
            return false;
        }

    }); 	
}

function realizaAlteracaoSenha(pessoa){	


	// gerando um token ficticio
    token = gerarTokenSync($("#emailNovaSenha").val(), "123");    

    // gerando a url de envio dos dados
    var urlSyncAlterarSenha = getUrlSync() + "pessoa?token=" + token + "(" + $("#emailNovaSenha").val() + ")";
	urlSyncAlterarSenha = urlSyncAlterarSenha + "alterarSenha";
	
    var pessoa = new Object();
	pessoa.email = $("#emailNovaSenha").val();
	
    // transformando o objeto em uma string json
    var obj = JSON.stringify({ pessoa: pessoa });            
    // enviando os dados
    $.ajax({
        url: urlSyncAlterarSenha,
        type: "GET",
        contentType: "application.mob/json; charset=utf8",
        data: obj,
        async: false,
        dataType: "json",        
        success: function (data) {
			if (data.messages != null &&  data.messages.erro != null && data.messages.erro[0] != null){
        		myApp.alert(data.messages.erro[0], "Atenção");
        		myApp.hideIndicator();
        		return false;
        	}
			
			myApp.hideIndicator();
			myApp.alert("A sua nova senha foi enviada para o e-mail informado.", "Atenção!");
			
        },
        
        // retorno de erro da chamada
        error: function(jqXHR, exception) {
            trataErroSincronizacao(jqXHR, exception);
            return false;
        }

    }); 
}
