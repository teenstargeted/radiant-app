// -----------------------------------------------------------------------------

jQuery(document).ready(function($) {
	
	// -------------------------------------------------------------------------
	
	function setIndexes(elements, parentPrefix) {
		
		elements = elements.filter('h1, h2, h3, h4, h5, h6');
		
		if (typeof parentPrefix == 'undefined') {
			parentPrefix = '';
		}
		var tag = elements.eq(0).get(0).tagName.toLowerCase();
		var h   = parseInt(tag.substr(-1));
		var toc = $('<ol></ol>').css('list-style-type', 'none');
		
		elements.each(function(index) {
			
			var num = parentPrefix + (index+1) + '.';
			var href = 'num-'+num.replace(/\./g, '');
			var childs = $(this).nextUntil(tag, 'h'+(h+1));
			
			$(this).attr('id', href).prepend(num + ' ');
			toc.append(
				$('<li></li>').html(
					$('<a></a>').attr('href', '#'+href).text($(this).text())
				)
			);
			
			if (childs.length > 0) {
				toc.append(setIndexes(childs, num));
			}
			
		});
		
		return toc;
		
	}
	
	// -------------------------------------------------------------------------
	
	// Document title
	$('title').text($('h1').text());
	
	// Table of contents
	var toc = setIndexes($('h2:gt(0)'));
	$('#toc').replaceWith(toc);
	
});