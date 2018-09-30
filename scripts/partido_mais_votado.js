var m = {top: 50, right: 150, bottom: 100, left: 150},
	h = 600 - m.top - m.bottom,
	w = 1200 - m.left - m.right,
	barwidth = 5;


function votosPorPartido() {
	var dataset = null;
	var UF = document.getElementById("UF").value;
	var cargo = document.getElementById("cargo").value;

	// Caso de contorno
	if (UF == "" || cargo == "")
		return;

	d3.selectAll("svg > *").remove(); // Limpa plot anterior

	var arquivo = null;
	switch (cargo) {
		case 'dep-estadual':
			arquivo = (UF == 'DF') ? "./data/deputado_distrital.csv" : "./data/deputado_estadual.csv";
			break;
		case 'dep-federal':
			arquivo = "./data/deputado_federal.csv"
			break;
		case 'senador':
			arquivo = "./data/senador.csv"
			break;
		case 'governador':
			arquivo = "./data/governador.csv"
			break;
		case 'presidente':
			arquivo = "./data/presidente.csv"
			break; 
	}

	d3.csv(arquivo, function(error, data) {

		var cargo = document.getElementById("cargo").value;
		if (error)
			return console.log(error);

		var votos_partidos = [];
		var total_votos = 0;

		// Totaliza votos dos partidos
		for (var i = 0; i < data.length; i++) {
			// Retorna dados apenas para o estado desejado
			if (data[i]['cat_state'] == UF) {
				if (data[i]['num_turn'] == '1') {
					partido = data[i]['cat_party'];
					candidato = (cargo == 'dep-federal' || cargo == 'dep-estadual') ? null : data[i]['cat_candidate_name']; 
					num_votos = parseInt(data[i]['num_votes']);
					total_votos += num_votos;

					pos = votos_partidos.map(function(e) { return e.nome; }).indexOf(partido);
					if (pos >= 0) {
						votos_partidos[pos].votos += num_votos;
					}
					else
						votos_partidos.push({
							nome: partido,
							votos: num_votos,
							nome_candidato: candidato
						});
				}
			}
		}


		// Ordena vetor pela quantidade de votos
		votos_partidos.sort(function(a, b) {
			if (a.votos > b.votos) return 1;
			if (a.votos < b.votos) return -1;
			else return 0;
		}).reverse(); 


		// Totaliza percentual de votos dos partidos (duas casas decimais)
		var percentual_acumulado = 0;
		var votos_acumulados = 0;
		for(var i = 0; i < votos_partidos.length; i++) {
			votos_acumulados += votos_partidos[i].votos;
			votos_partidos[i].votos_acumulados = votos_acumulados;

			votos_partidos[i].percentual = (votos_partidos[i].votos / total_votos);
			//votos_partidos[i].percentual = parseFloat(votos_partidos[i].percentual.toFixed(2));
			percentual_acumulado += votos_partidos[i].percentual;
			votos_partidos[i].percentual_acumulado = percentual_acumulado;
		}

		dataset = data;
		data = votos_partidos;


		// Eixos e escalas
		var xScale = d3.scale.ordinal().rangeRoundBands([0, w], 0.15);
		xScale.domain(data.map(function(partido) { return partido.nome; }));

		var yhist = d3.scale.linear()
							.domain([0, d3.max(data, function(partido) { return partido.votos; })])
							.range([h, 0]);

		var ycum = d3.scale.linear().domain([0, 1]).range([h, 0]);

		var xAxis = d3.svg.axis()
						.scale(xScale)
						.orient('bottom');

		var yAxis = d3.svg.axis()
						.scale(yhist)
						.tickFormat(function(d){ return d / 1000; })
						.orient('left');

		var yAxis2 = d3.svg.axis()
						.scale(ycum)
						.tickFormat(function(d){ return d*100 + "%"; })
						.orient('right');

		// Caixa de informações
		var div = d3.select("body").append("div")	
					.attr("class", "tooltip")				
					.style("opacity", 0);

		// Plota svg
		var svg = d3.select("#chart").append("svg")
					.attr("width", w + m.left + m.right)
					.attr("height", h + m.top + m.bottom)
					.append("g")
					.attr("transform", "translate(" + m.left + "," + m.top + ")");

		// Plota histograma
		var bar = svg.selectAll(".bar")
					.data(data)
					.enter().append("g")
					.attr("class", "bar")
					.on("mouseover", function(partido) {		
							div.transition()		
							.duration(200)		
							.style("opacity", .9);		
	
							//div.html("<b>" + partido.nome + "</b><br/>" 
							div.html("<b>" + ((partido.nome_candidato != null) ? (partido.nome_candidato + " (" + partido.nome + ")") : partido.nome)
									+ "</b><br/>"
									+ partido.votos.toLocaleString('pt-BR') + " votos <br/>" 
									+ (partido.percentual * 100).toFixed(2) + "% do total")	
							.style("left", (d3.event.pageX) + "px")		
							.style("top", (d3.event.pageY - 50) + "px");	
						})					
					.on("mouseout", function(partido) {		
							div.transition()		
							.duration(500)		
							.style("opacity", 0);	
						});

		bar.append("rect")
			.attr("x", function(partido) { return xScale(partido.nome); })
			.attr("width", xScale.rangeBand())
			.attr("y", function(partido) { return yhist(partido.votos); })
			.attr("height", function(partido) { return h - yhist(partido.votos); });

		// Plota CDF (cumulative distribution function) -> linha cumulativa de pareto
		var guide = d3.svg.line()
					.x(function(partido) { return xScale(partido.nome) + (xScale.rangeBand() / 2); })
					.y(function(partido){ return ycum(partido.percentual_acumulado) });
					//.interpolate('basis');

		var line = svg.append('path')
					.datum(data)
					.attr('d', guide(data))
					.attr('class', 'line');

		// Plota pontos sobre a linha
		svg.selectAll("dot")
			.data(data)
			.enter().append("circle")
			.attr("r", 4.5)
			.attr("class", "dot")
			.attr("cx", function(partido) { return xScale(partido.nome) + (xScale.rangeBand() / 2); })
			.attr("cy", function(partido) { return ycum(partido.percentual_acumulado); })
			.on("mouseover", function(partido) {		
							div.transition()		
							.duration(200)		
							.style("opacity", .9);		
	
							div.html("<b> Acumulado até " + ((partido.nome_candidato != null) ? (partido.nome_candidato + " (" + partido.nome + ")") : partido.nome)
									+ "</b><br/>"
									+ "Número de votos: " + partido.votos_acumulados.toLocaleString('pt-BR') + "<br/>" 
									+ "Percentual: " + (partido.percentual_acumulado * 100).toFixed(2) + "%")	
							.style("left", (d3.event.pageX) + "px")		
							.style("top", (d3.event.pageY + 10) + "px");	
						})					
			.on("mouseout", function(partido) {		
							div.transition()		
							.duration(500)		
							.style("opacity", 0);	
						});

		// Plota eixos
		svg.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + h + ")")
			.call(xAxis)
			.selectAll("text")
				.attr("y", 6)
				.attr("x", 5)
				.attr("dy", "1em")
				.attr("transform", "rotate(45)")
				.style("text-anchor", "start");

		svg.append("g")
			.attr("class", "y axis")
			.call(yAxis)
			.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", 0 - (m.left / 2))
			.attr("x", 0 - (h / 2))
			.attr("dy", ".1em")
			.style("text-anchor", "middle")
			.text("Total de votos (em milhares)");

		svg.append("g")
			.attr("class", "y axis")
			.attr("transform", "translate(" + [w, 0] + ")")
			.call(yAxis2)
			.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", 20 + (m.right / 2))
			.attr("x", 0 - (h / 2))
			.attr("dy", "-1em")
			.style("text-anchor", "middle")
			.text("Percentual de votos válidos");
	});
}


