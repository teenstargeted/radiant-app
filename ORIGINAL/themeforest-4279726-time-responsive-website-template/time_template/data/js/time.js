/**
 * @package Time_Template
 * @since Time 1.0
 */

// -----------------------------------------------------------------------------

(function($) {
	
	'use strict';

	// -------------------------------------------------------------------------
	
	// http://desandro.github.com/imagesloaded/
	$.fn.imagesLoaded = function( callback ) {
		var BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
		
		var $this = this,
			deferred = $.isFunction($.Deferred) ? $.Deferred() : 0,
			hasNotify = $.isFunction(deferred.notify),
			$images = $this.find('img').add( $this.filter('img') ),
			loaded = [],
			proper = [],
			broken = [];
	
		// Register deferred callbacks
		if ($.isPlainObject(callback)) {
			$.each(callback, function (key, value) {
				if (key === 'callback') {
					callback = value;
				} else if (deferred) {
					deferred[key](value);
				}
			});
		}
	
		function doneLoading() {
			var $proper = $(proper),
				$broken = $(broken);
	
			if ( deferred ) {
				if ( broken.length ) {
					deferred.reject( $images, $proper, $broken );
				} else {
					deferred.resolve( $images );
				}
			}
	
			if ( $.isFunction( callback ) ) {
				callback.call( $this, $images, $proper, $broken );
			}
		}
	
		function imgLoadedHandler( event ) {
			imgLoaded( event.target, event.type === 'error' );
		}
	
		function imgLoaded( img, isBroken ) {
			// don't proceed if BLANK image, or image is already loaded
			if ( img.src === BLANK || $.inArray( img, loaded ) !== -1 ) {
				return;
			}
	
			// store element in loaded images array
			loaded.push( img );
	
			// keep track of broken and properly loaded images
			if ( isBroken ) {
				broken.push( img );
			} else {
				proper.push( img );
			}
	
			// cache image and its state for future calls
			$.data( img, 'imagesLoaded', { isBroken: isBroken, src: img.src } );
	
			// trigger deferred progress method if present
			if ( hasNotify ) {
				deferred.notifyWith( $(img), [ isBroken, $images, $(proper), $(broken) ] );
			}
	
			// call doneLoading and clean listeners if all images are loaded
			if ( $images.length === loaded.length ) {
				setTimeout( doneLoading );
				$images.unbind( '.imagesLoaded', imgLoadedHandler );
			}
		}
	
		// if no images, trigger immediately
		if ( !$images.length ) {
			doneLoading();
		} else {
			$images.bind( 'load.imagesLoaded error.imagesLoaded', imgLoadedHandler )
			.each( function( i, el ) {
				var src = el.src;
	
				// find out if this image has been already checked for status
				// if it was, and src has not changed, call imgLoaded on it
				var cached = $.data( el, 'imagesLoaded' );
				if ( cached && cached.src === src ) {
					imgLoaded( el, cached.isBroken );
					return;
				}
	
				// if complete is true and browser supports natural sizes, try
				// to check for image status manually
				if ( el.complete && el.naturalWidth !== undefined ) {
					imgLoaded( el, el.naturalWidth === 0 || el.naturalHeight === 0 );
					return;
				}
	
				// cached images don't fire load sometimes, so we reset src, but only when
				// dealing with IE, or image is complete (loaded) and failed manual check
				// webkit hack from http://groups.google.com/group/jquery-dev/browse_thread/thread/eee6ab7b2da50e1f
				if ( el.readyState || el.complete ) {
					el.src = BLANK;
					el.src = src;
				}
			});
		}
	
		return deferred ? deferred.promise( $this ) : $this;
	};
	
	// -------------------------------------------------------------------------
	
	// Get data
	$.fn.getData = function(key, defaultValue) {
		return this.is('[data-'+key+']') ? this.data(key) : defaultValue;
	};
	
	// -------------------------------------------------------------------------
	
	// Discard white space
	$.fn.discardWhiteSpace = function() {
		return this.each(function() {
			$(this).contents().filter(function() {
				return this.nodeType === 3;
			}).remove();
		});
	};
	
	// -------------------------------------------------------------------------
	
	// Movable container
	$.fn.movableContainer = function(forceTouchDevice) {
		
		// Touch device
		var touchDevice = ('ontouchstart' in document.documentElement) || (typeof window.navigator.msPointerEnabled != 'undefined');
		if (typeof forceTouchDevice != 'undefined') {
			touchDevice = touchDevice || forceTouchDevice;
		}

		// Movable container
		return this.removeClass('movable-container').each(function() {
			
			// Original margins
			var margins = {
				marginTop:    $(this).css('margin-top'),
				marginBottom: $(this).css('margin-bottom')
			};
			
			// Wrapping
			var content = $(this).addClass('movable-container-content').wrap('<div class="movable-container" />');
			var mc      = content.parent().css(margins);
			
			// Max left position
			var maxLeft = function() {
				return mc.width() - content.width() - (touchDevice ? nav.outerWidth(true) : 0);
			};
			
			// Touchable device
			if (touchDevice) {
				
				var nav = $('<div />', {'class': 'movable-container-nav'})
					.append('<a class="button"><i class="icon-fast-backward"></i></a>')
					.append('<a class="button"><i class="icon-fast-forward"></i></a>')
					.appendTo(mc);
				
				var buttons = $('.button', nav).click(function() {
					
					// Disabled
					if ($(this).is('.disabled')) {
						return;
					}
					
					// Position
					var s = ($(this).index() == 0 ? 1 : -1) * Math.round((mc.width()-nav.outerWidth(true))*0.9);
					var x = Math.max(Math.min(content.position().left + s, 0), maxLeft());
					
					// Buttons
					buttons.eq(0).toggleClass('disabled', x == 0);
					buttons.eq(1).toggleClass('disabled', x == maxLeft());
					
					// Content animation
					content.stop(true).animate({left: x}, 400);
					
				});
				buttons.eq(0).addClass('disabled');
				
			}
			
			// Non-touchable device
			else {
				$(mc)
					.mousemove(function(event) {
						var f = Math.min(Math.max((event.pageX-mc.offset().left-20) / (mc.width()-40), 0), 1);
						var x = Math.round((mc.width() - content.width()) * f);
						content.stop(true).css('left', x);
					})
					.mouseleave(function() {
						content.stop(true).animate({left: '+=0'}, 1600).animate({left: 0}, 400);
					});
			}
			
			// Resize event
			var on_resize = function() {
				content.css('left', Math.max(content.position().left, maxLeft()));
				if (touchDevice) {
					if (content.width() > mc.width()) {
						nav.show();
						buttons.eq(0).toggleClass('disabled', content.position().left == 0);
						buttons.eq(1).toggleClass('disabled', content.position().left == maxLeft());
					} else {
						nav.hide();
						content.css('left', 0);
					}
				}
			};
			$(window).resize(on_resize); on_resize();
			
		});
		
	};
	
	// -------------------------------------------------------------------------
	
	// Scroller
	$.fn.scroller = function(counter) {
		
		if (typeof counter == 'undefined') {
			counter = true;
		}
		
		this.filter('ul').removeClass('scroller').each(function() {
			
			// Original margins
			var margins = {
				marginTop:    $(this).css('margin-top'),
				marginBottom: $(this).css('margin-bottom')
			};

			// Wrapping
			var content  = $(this).addClass('scroller-content').wrap('<div class="scroller" />');
			var items    = $('> li', content);
			var scroller = content.parent().css(margins);
	
			// Content & items
			content.css('width', (items.length*100)+'%');
			items.eq(0).addClass('active');
				
			// Navigation
			var nav = $('<div></div>', {'class': 'scroller-nav'})
				.append('<a class="button"><i class="icon-left-open"></i></a>')
				.append('<a class="button"><i class="icon-right-open"></i></a>')
				.appendTo(scroller);
			if (counter) {
				nav.append('<small>1/'+items.length+'</small>');
			}
			
			var buttons = $('.button', nav).click(function() {
				
				// Disabled
				if ($(this).is('.disabled')) {
					return;
				}
				
				// Active & next item
				var active = items.filter('.active');
				var next   = items.eq(Math.min(Math.max(active.index() + ($(this).index() == 0 ? -1 : 1), 0), items.length-1));
	
				active.removeClass('active');
				next.addClass('active');
				
				// Buttons
				buttons.eq(0).toggleClass('disabled', next.index() == 0);
				buttons.eq(1).toggleClass('disabled', next.index() == items.length-1);
				
				// Counter
				if (counter) {
					$('small', nav).text((next.index()+1)+'/'+items.length);
				}

				// Content scroll
				content.stop(true).animate({
					left:   -next.position().left,
					height: next.outerHeight()
				}, 400);
				
			});
			buttons.eq(0).addClass('disabled');
			
			// Resize event
			var on_resize = function() {
				var active = items.filter('.active');
				items.css('width', scroller.width());
				content.stop(true).css({
					left:   -active.position().left,
					height: active.outerHeight()
				});
			};
			$(window).resize(on_resize); on_resize();
			
		});
		
		return this;
	
	};

})(jQuery);
	
// -----------------------------------------------------------------------------

jQuery(document).ready(function($) {
	
	// No-js
	$('html').removeClass('no-js').addClass('js');
		
	// Configuration
	var conf = $.extend({}, {
		templatePath:               '.',
		tableMobileColsThreshold:   3,
		columnsMobileColsThreshold: 3,
		fancyboxOptions:            {},
		flexsliderOptions:          {
			animation: 'slide',
			slideshow: false,
			slideshowSpeed: 3000,
			animationSpeed: 400
		},
		layersliderOptions:         {
			skin: 'time-bright',
			autoStart: false,
			autoPlayVideos: false,
			navStartStop: false,
			navButtons: true,
			thumbnailNavigation: 'disabled'
		},
		masonryOptions:             {
			animationOptions: {duration: 400}
		},
		captions:                   {
			bricksAllButton: 'all',
			timeDaysAgo:     'about %d days ago',
			timeDayAgo:      'about a day ago',
			timeHoursAgo:    'about %d hours ago',
			timeHourAgo:     'about an hour ago',
			timeMinutesAgo:  'about %d minutes ago',
			timeSecondsAgo:  'about %d seconds ago',
			timeNow:         'just now'
		}
	}, typeof timeConfig != 'undefined' ? timeConfig : {});

	// Mobile
	/*
	var isMobile = function() {
		return $('html').css('border-top-style') == 'hidden';
	};
	*/
	
	// Human time difference
	var humanTimeDiff = function(from, to)
	{
		if (typeof to == 'undefined') {
			to = new Date();
		}
		var delta = Math.abs((to.getTime() - from.getTime()) / 1000);
		if (delta < 1) {
			delta = 0;
		}
		var time_ago = {
			days:    parseInt(delta / 86400, 10),
			hours:   parseInt(delta / 3600, 10),
			minutes: parseInt(delta / 60, 10),
			seconds: parseInt(delta, 10)
		};
		if (time_ago.days > 2)     return conf.captions.timeDaysAgo.replace('%d', time_ago.days);
		if (time_ago.hours > 24)   return conf.captions.timeDayAgo;
		if (time_ago.hours > 2)    return conf.captions.timeHoursAgo.replace('%d', time_ago.hours);
		if (time_ago.minutes > 45) return conf.captions.timeHourAgo;
		if (time_ago.minutes > 2)  return conf.captions.timeMinutesAgo.replace('%d', time_ago.minutes);
		if (time_ago.seconds > 1)  return conf.captions.timeSecondsAgo.replace('%d', time_ago.seconds);
		return conf.captions.timeNow;
	};
	
	// Internet Explorer (< 9)
	if ($('html').is('.lt-ie9')) {
		$('<div />', {'class': 'before'}).prependTo($('#top'));
	}
	
	// Hash
	var hash = unescape(self.document.location.hash).substring(1);
	
	// Device pixel ratio
	var dpr = typeof window.devicePixelRatio == 'undefined' ? 1 : window.devicePixelRatio;
	$('html').addClass(dpr >= 2 ? 'dpr-2x' : 'dpr-1x');
	
	// High resolution image
	if (dpr >= 2) {
		$('img[data-2x]').attr('src', function() {
			return $(this).data('2x');
		});
		$(':not(img)[data-bg-2x]').css('background-image', function() {
			return 'url('+$(this).data('bg-2x')+')';
		});
	}
	$(':not(img)[data-1x][data-2x]').replaceWith(function() {
		return $('<img />').attr('src', $(this).data(dpr >= 2 ? '2x' : '1x'));
	});
	
	// Horizontal align
	$(window).bind('load', function() {
		$('.horizontal-align')
			.css('width', function() { return $(this).outerWidth(); })
			.css('float', 'none');
	});

	// Vertical align
	(function() {
		var on_resize = function() {
			$('.vertical-align').each(function() {
				$(this).css('top', ($(this).parent().height() - $(this).outerHeight(true))*0.5);
			});
		};
		$(window).resize(on_resize); $(window).bind('load', on_resize); on_resize();
	})();
	
	// Movable container
	$('.movable-container').each(function() {
		$(this).movableContainer($(this).is('[data-movable-container-force-touch-device="true"]'));
	});
	
	// Scroller
	$('.scroller').scroller();

	// Zoom hover
	$('.zoom-hover').each(function() {
		
		// Layers
		var overlay         = $('<div />', {'class': 'zoom-hover-overlay'}).appendTo(this);
		var title_container = $('<div />', {'class': 'zoom-hover-title-container'}).appendTo(overlay);
		var title;
		
		// Title & icon
		if ($(this).is('[data-zoom-hover-title]')) {
			var icon = $(this).getData('zoom-hover-icon', 'icon-right');
			title = $('<h3 />').text($(this).data('zoom-hover-title'));
			if (icon) {
				title.append( $('<i />', {'class': icon}));
			}
		} else {
			var icon = $(this).getData('zoom-hover-icon', 'icon-plus-circled');
			title = icon ? $('<i />', {'class': icon}) : $('<div />');
		}
		title.addClass('zoom-hover-title').appendTo(title_container);
		
		// Title position
		var title_left;
		
		// Hover
		$(this)
			.one('mouseenter', function() {
				title_left = Math.round(-0.5*title.innerWidth());
				title.css('top', Math.round(-0.5*title.innerHeight()));
			})
			.hover(function() {
				if ($('html').is('.lt-ie9')) {
					$('> .zoom-hover-overlay', this).css('left', title_left);
				} else {
					$('> .zoom-hover-overlay', this).stop(true).fadeTo(100, 1, 'linear');
					$('> .zoom-hover-overlay > .zoom-hover-title-container > .zoom-hover-title', this)
						.stop(true)
						.css('left', title_left-10)
						.animate({left: title_left}, 100);
				}
			}, function() {
				if (!$('html').is('.lt-ie9')) {
					$('> .zoom-hover-overlay', this).stop(true).fadeTo(100, 0, 'linear');
					$('> .zoom-hover-overlay > .zoom-hover-title-container > .zoom-hover-title', this)
						.stop(true)
						.animate({left: title_left+10}, 100);
				}
			});
		
	});
	
	// Grayscale hover
	$('.grayscale-hover:has(> img)').each(function() {
		
		// Images
		var img    = $('> img', this);
		var gs_img = img.clone().appendTo($(this));
		
		img.addClass('grayscale');
		gs_img.addClass('grayscale-hover-image');
		
		// Hover
		$(this).hover(function() {
			gs_img.stop(true).fadeTo(200, 1);
		}, function() {
			gs_img.stop(true).fadeTo(200, 0);
		});
		
	});

	// Embed
	$('.embed').each(function() {
		var video = $('> iframe, > object, > embed', this).filter('[width][height]').first();
		if (video.length > 0) {
			var ratio = (parseInt(video.attr('height'), 10) / parseInt(video.attr('width'), 10))*100;
			$(this).css({'padding-bottom': ratio+'%', height: 0});
		}
	});
		
	// Table
	$('table:has(thead):has(tbody)').each(function() {
		if ($('thead tr > *', this).length >= conf.tableMobileColsThreshold) {
			$('tbody tr > *', this).prepend(function() {
				return $('<label />', {'class': 'alt-mobile-label'}).text($(this).closest('table').find('thead th').eq($(this).index()).text());
			});
			$(this).addClass('alt-mobile');
		}
	});

	// Input
	$('.ie input[type="text"], .ie textarea').filter('[placeholder]').each(function() {
		var ph = $(this).attr('placeholder');
		$(this)
			.focus(function() {
				if ($(this).hasClass('placeholder')) {
					$(this).removeClass('placeholder').val('');
				}
			})
			.blur(function() {
				if ($(this).val() === '') {
					$(this).addClass('placeholder').val(ph);
				}
			})
			.blur();
	});
	
	// Button
	$('button, input[type="button"]').filter('[data-href]').click(function() {
		switch ($(this).getData('target', '_self')) {
			case '_blank':  window.open($(this).data('href')); break;
			case '_top':    window.top.location    = $(this).data('href'); break;
			case '_parent': window.parent.location = $(this).data('href'); break;
			default:        window.location        = $(this).data('href');
		}
	});
	
	// Message
	$('.message[data-message-closable="true"]').each(function() {
		var _this = this;
		$('<i class="icon-cancel close"></i>').click(function() {
			if ($(_this).is(':animated')) {
				return;
			}
			var prev = $(_this).prev();
			var m    = prev.length > 0 ? prev.css('margin-bottom') : $(_this).css('margin-top');
			$(_this)
				.fadeTo(300, 0)
				.animate({'border-width': 0, 'margin-top': '-'+m, padding: 0, height: 0}, 300)
				.hide(0);
		}).appendTo($(this));
	});
	
	// Tooltip
	if ($('.tooltip').length > 0) {
		$.getScript(conf.templatePath+'/data/js/jquery.tipsy.min.js', function() {
			$('.tooltip').each(function() {
				$(this).tipsy({
					gravity: $(this).getData('tooltip-gravity', 's'),
					fade:    $(this).getData('tooltip-fade', false)
				});
			});
		});
	}
	
	// Columns
	$('.columns').each(function() {
		var cols = $('> ul > li', this);
		if (!$(this).hasClass('alt-mobile') && cols.length >= conf.columnsMobileColsThreshold && cols.filter('.'+cols.eq(0).attr('class')).length == cols.length) {
			$(this).addClass('alt-mobile');
		}
		var sum = {desktop: 0, mobile: 0};
		cols.each(function() {
			if (sum.desktop >= 1) {
				$(this).addClass('clear-row');
				sum.desktop = 0;
			}
			if (sum.mobile >= 1) {
				$(this).addClass('mobile-clear-row');
				sum.mobile = 0;
			}
			var m = $(this).attr('class').match(/\bcol-1-([0-9]+)\b/);
			if (m !== null) {
				sum.desktop += 1/m[1];
				sum.mobile  += 1/Math.ceil(m[1]/2);
			}
		});
	});
	
	// Tabs
	$('.tabs').each(function() {
		var nav = $('<ul />', {'class': 'nav'}).prependTo(this);
		var tabs = $('> div[title]', this);
		tabs
			.each(function() {
				$('<li />', {'class': $(this).hasClass('active') ? 'active' : ''})
					.text($(this).attr('title'))
					.click(function() {
						$(this).addClass('active').siblings().removeClass('active');
						tabs.removeClass('active').eq($(this).index()).addClass('active');
					})
					.appendTo(nav);
			})
			.attr('title', '');
		nav.movableContainer();
		$('> :first-child, > .active', nav).click();
	});
	
	// Super tabs
	$('.super-tabs').each(function() {

		var nav     = $('<ul />', {'class': 'nav'}).appendTo(this);
		var tabs    = $('> div[title]', this);
		var ordered = $(this).is('[data-super-tabs-ordered="true"]');
		
		// Wrapping
		$(this).wrapInner($('<div />'));
		var wrapper = $('> div', this);
		var on_resize = function() {
			wrapper.css('height', tabs.filter('.active').height());
		};
		$(window).resize(on_resize);

		// Tabs
		tabs
			.each(function(i) {
				$('<li />', {'class': $(this).hasClass('active') ? 'active' : ''})
					.append($('<div />', {'class': 'table-vertical-align'})
						.append($('<div />')
							.append($('<h2 />')
								.text($(this).attr('title'))
								.prepend(ordered ? $('<span />').text(i+1) : null)	
							)
							.append($(this).is('[data-super-tabs-description]') ? $('<small />').text($(this).data('super-tabs-description')) : null)
						)
					)
					.click(function() {
						$(this).addClass('active').siblings().removeClass('active');
						tabs.removeClass('active').eq($(this).index()).addClass('active');
						on_resize();
					})
					.appendTo(nav);
			})
			.attr('title', '');

		// Navigation
		$('li', nav).css('height', (100 / tabs.length).toFixed(2)+'%');
		$('> :first-child, > .active', nav).click();
		
		$(this).imagesLoaded(on_resize);
	
	});
	
	// Toggles
	$('.toggles').each(function() {
		var _this = this;
		$('> div[title]', this).each(function() {
			
			// Title
			var title = $('<h3 />')
				.text($(this).attr('title'))
				.prepend('<i class="icon-plus-circled"></i>')
				.prepend('<i class="icon-minus-circled" style="display: none;"></i>')
				.click(function() {	
					if ($(_this).is('[data-toggles-singular="true"]') && !$(this).next('div[title]').is(':visible')) {
						$(this).parent().siblings().each(function() {
							$('> h3 > i', this).css('display', function(i) { return i > 0 ? 'block' : 'none'; });
							$('> div[title]', this).stop(true).slideUp();
						});
					}					
					$('i', this).toggle();
					$(this).next('div[title]').stop(true).slideToggle();
				});
			
			// Wrap
			$(this)
				.attr('title', '')
				.wrap('<div></div>')
				.parent()
					.prepend(title);
			
			// Active
			if ($(this).hasClass('active')) {
				$(this).show().prev('h3').find('i').toggle();
			}
			
		});

	});
	
	// Fancybox
	$('.fb')
		.each(function() {
			var youtube = $(this).attr('href').match(/^https?:\/\/(www\.youtube\.com\/watch\?v=|youtu\.be\/)([-_a-z0-9]+)/i);
			var vimeo   = $(this).attr('href').match(/^https?:\/\/vimeo.com\/([-_a-z0-9]+)/i);
			if (youtube != null) {
				$(this).data({'fancybox-type': 'iframe', 'fancybox-href': 'http://www.youtube.com/embed/'+youtube[2]+'?wmode=opaque'});
			}
			else if (vimeo != null) {
				$(this).data({'fancybox-type': 'iframe', 'fancybox-href': 'http://player.vimeo.com/video/'+vimeo[1]});
			}
		})
		.fancybox($.extend({}, conf.fancyboxOptions, {
			margin:      [30, 70, 30, 70],
			padding:     2,
			aspectRatio: true
		}));
	
	// Social buttons
	$('.social-buttons ul').discardWhiteSpace();

	// Contact form
	$('.contact-form').submit(function() {
		if ($('input[type="submit"]', this).prop('disabled')) {
			return false;
		}
		var _this = this;
		$('input[type="submit"]', this).prop('disabled', true);
		$('.load', this).stop(true).fadeIn(200);
		$('.msg', this).stop(true).fadeOut(200);
		$.ajax({
			url: $(this).attr('action'),
			type: 'POST',
			data: $(this).serialize(),
			dataType: 'json',
			complete: function() {
				$('input[type="submit"]', _this).prop('disabled', false);	
			},
			success: function(data) {
				$('.load', _this).fadeOut(200, function() {
					if (data === null) {
						$('.msg', _this).text('Unknown error.');
					} else {
						$('.msg', _this).text(data.message);
						if (data.result) {
							$('input[type="text"], textarea', _this).val('');
						}
					}
					$('.msg', _this).fadeIn(200);
				});
			}
		});
		return false;
	});
	
	// Login form
	$('[href="#login-form"]').fancybox($.extend({}, conf.fancyboxOptions, {
		type:     'inline',
		margin:   [10, 10, 10, 10],
		padding:  20,
		width:    180,
		height:   'auto',
		autoSize: false,
		tpl:      {
			wrap: '<div class="fancybox-wrap fancybox-login-form" tabIndex="-1"><div class="fancybox-skin"><div class="fancybox-outer"><div class="fancybox-inner"></div></div></div></div>'
		}
	}));
	
	// Slider
	$('.slider')
		.flexslider($.extend({}, conf.flexsliderOptions, {
			namespace:      '',	
			smoothHeight:   true,
			useCSS:         false,
			video:          true,
			prevText:       '<i class="icon-left-open-mini"></i>',
			nextText:       '<i class="icon-right-open-mini"></i>',
			start:          function(slider) {						

				if (typeof window.addEventListener == 'function') { // window.attachEvent('onmessage', on_message_received, false);
					
					// Pause slideshow on YouTube and Vimeo player play
					window.addEventListener('message', function(e) {
						var data = JSON.parse(e.data);
						switch (data.event) {
							case 'ready':
								// https://github.com/CSS-Tricks/AnythingSlider/blob/master/js/jquery.anythingslider.video.js
								$('iframe[src^="http://www.youtube.com"]', slider.slides).each(function() {
									this.contentWindow.postMessage(JSON.stringify({event: 'listening', func: 'onStateChange'}), '*');
								});
								$('iframe[src^="http://player.vimeo.com"]', slider.slides).each(function() {
									this.contentWindow.postMessage(JSON.stringify({method: 'addEventListener', value: 'play'}), $(this).attr('src').split('?')[0]);
								});
								break;
							case 'onStateChange': // YouTube
								if (data.info.playerState == 1) {
									slider.pause();
								}
								break;
							case 'play': // Vimeo
								slider.pause();
								break;	
						}
					}, false);
					
				}

				// Hidding control-nav on embed slides
				if (slider.slides.eq(slider.currentSlide).is(':has(.embed)')) {
					$('.control-nav', slider).hide();
				}

			},
			before:         function(slider) {
				
				var current_slide = slider.slides.eq(slider.currentSlide);
				
				// Pause YouTube and Vimeo players
				var youtube = $('iframe[src^="http://www.youtube.com"]', current_slide);
				var vimeo = $('iframe[src^="http://player.vimeo.com"]', current_slide);
				if (youtube.length > 0) {
					youtube[0].contentWindow.postMessage(JSON.stringify({event: 'command', func: 'pauseVideo'}), '*');
				}
				if (vimeo.length > 0) {
					vimeo[0].contentWindow.postMessage(JSON.stringify({method: 'pause'}), vimeo.attr('src').split('?')[0]);
				}
				$('audio, video', current_slide).each(function() {
					this.player.media.pause();
				});
				
				// Hidding control-nav on embed slides
				if (slider.slides.eq(slider.animatingTo).is(':has(.embed)')) {
					$('.control-nav', slider).fadeOut(100);
				} else {
					$('.control-nav', slider).fadeIn(100);
				}
				
			}
		}))
		.hover(function() {
			$('.direction-nav a', this).stop(true).fadeTo(100, 1);
		}, function() {
			$('.direction-nav a', this).stop(true).fadeTo(100, 0);
		})
		.find('.direction-nav a')
			.addClass('alt');
	
	// Bricks
	if ($('.bricks').length > 0) {
		
		// Preparing
		$('.bricks').each(function() {
			if ($(this).getData('bricks-columns', 2) >= conf.columnsMobileColsThreshold) {
				$(this).addClass('alt-mobile');
			}
			$('> div', this).addClass('bricks-box');
		});

		$.getScript(conf.templatePath+'/data/js/jquery.masonry.min.js', function() {
			
			$('.bricks').each(function() {

				var boxes   = $('.bricks-box', this);
				var masonry = $('<div />', {'class': 'bricks-masonry'}).append(boxes).appendTo($(this)); 

				// Masonry
				masonry.imagesLoaded(function() {
					$(this)
						.masonry($.extend({}, conf.masonryOptions, {
							itemSelector:     '.bricks-box:not(.bricks-box-hidden)',
							isAnimated:       true,
							columnWidth:      function(containerWidth) {
								return 1; //containerWidth / (columns >= conf.columnsMobileColsThreshold && isMobile()) ? Math.ceil(columns / 2) : columns;
							}
						}))
						.siblings('.bricks-filter').show();
				});
				
				// Filter
				if ($(this).is('[data-bricks-filter="true"]') && boxes.filter('[rel]').length > 0) {
					
					var filter = $('<div />', {'class': 'bricks-filter'}).prependTo($(this));

					// All button
					$('<a />', {'class': 'button', href: '#*'})
						.text(conf.captions.bricksAllButton)
						.click(function() {
							boxes.removeClass('bricks-box-hidden').fadeIn(200);
						})
						.appendTo(filter);
					
					// Rel buttons
					boxes.filter('[rel][rel!=""]').each(function() {	
						$.each($.grep($(this).attr('rel').split(' '), function(rel) {
							return $('.button[href="#'+rel+'"]', filter).length == 0;
						}), function(i, rel) {
							$('<a />', {'class': 'button', href: '#'+rel})
								.text(rel.replace('_', ' '))
								.click(function() {
									boxes.filter('[rel~="'+rel+'"]').removeClass('bricks-box-hidden').fadeIn(200);
									boxes.filter(':not([rel~="'+rel+'"])').addClass('bricks-box-hidden').fadeOut(200);
								})
								.appendTo(filter);
						});
					});

					// Buttons
					$('.button', filter).click(function() {
						$(this).addClass('active').siblings().removeClass('active');
						masonry.masonry('reload');
					});
					
					// Deep linking
					if (hash && hash != '*' && $('.button[href="#'+hash+'"]', filter).length > 0) {
						boxes.filter(':not([rel~="'+hash+'"])').addClass('bricks-box-hidden').hide();
						$('.button[href="#'+hash+'"]', filter).addClass('active');
					} else {
						$('.button:first', filter).addClass('active');
					}
	
				}
				
			});

		});
		
	}
	
	// Twitter	
	$('.twitter[data-twitter-username]').each(function() {
		var _this       = this;
		var count       = $(this).getData('twitter-count', 3);
		var orientation = $(this).getData('twitter-orientation', 'vertical');
		$.getJSON(conf.templatePath+'/data/php/twitter.php', {
			username:         $(this).data('twitter-username'),
			include_retweets: $(this).getData('twitter-include-retweets', true),
			exclude_replies:  $(this).getData('twitter-exclude-replies', false),
			count:            count,
		}, function(data) {
			var tweets = $('<ul />').appendTo(_this);
			$.each(data, function() {
				$('<li />')
					.html('<i class="icon-twitter"></i>'+this.html+'<br /><small><a href="'+this.url+'" class="alt">'+humanTimeDiff(new Date(this.date*1000))+'</a></small>')
					.appendTo(tweets);
			});
			if (orientation == 'scrollable') {
				tweets.scroller(false);
			} else if (orientation == 'horizontal') {
				tweets.wrap($('<div />', {'class': 'columns'})).find('li').addClass('col-1-'+count);
			}
		});
	});
	
	// Flickr
	// http://idgettr.com/
	$('.flickr[data-flickr-id]').each(function() {
		var _this = this;
		var count = $(this).getData('flickr-count', 4);
		var rel   = 'flickr-'+$(this).data('flickr-id').replace('@', '_');
		$.getJSON('http://api.flickr.com/services/feeds/photos_public.gne?jsoncallback=?', {
			id:     $(this).data('flickr-id'),
			format: 'json'
		}, function(data) {
			var photos = $('<ul />').appendTo($(_this));
			$.each(data.items, function(i, item) {
				if (i < count) {
					$('<li />').append(
						$('<a />', {rel: rel, href: item.media.m.replace('_m', '_b'), title: item.title}).append(
							$('<img />', {src: item.media.m.replace('_m', '_s')}).attr('width', 41).attr('height', 41)
						)
					).appendTo(photos);
				}
			});
			$('a[rel="'+rel+'"]', photos).fancybox($.extend({}, conf.fancyboxOptions, { // FancyBox strange behaviour, context is ignored
				margin:  [30, 70, 30, 70],
				padding: 2
			}));
		});
	});
	
	// Audio, video
	if ($('audio, video').length > 0) {
		$.getScript(conf.templatePath+'/data/js/jquery.mejs.min.js', function() {
			$('audio, video').mediaelementplayer({
				pluginPath:  conf.templatePath+'/data/mejs/',
				videoWidth:  '100%',
				videoHeight: '100%',
				audioWidth:  '100%',
				videoVolume: 'horizontal',
				success: function(mediaElement, domObject) {
					var slider = $(domObject).closest('.slider');
					if (slider.length > 0) {
						mediaElement.addEventListener('play', function() {
							slider.flexslider('pause');
						});
					}
				}
			});			
		});
	}
		
	// Navigation
	$('nav ul, nav li').discardWhiteSpace();
	$('nav li:has(li)').addClass('sub');
	$('nav a[href="#"]').click(function() {
		return false;
	});
	
	// Mobile navigation
	$('nav.mobile a:last-child').prepend(function() {
		return $(this).is(':has(img)') ? '<i></i>' : '<i class="icon-dot"></i>';
	});
	$('nav.mobile .sub > a')
		.prepend('<i class="toggle icon-plus-circled"></i>')
		.prepend('<i class="toggle icon-minus-circled" style="display: none;"></i>')
		.find('> i')
			.click(function() {
				var a = $(this).parent();
				a.next('ul').slideToggle();
				$('> i', a).toggle();
				return false;
			});
	$('nav.mobile ul ul .current').parents('ul').slice(0, -1).each(function() {
		$(this).toggle().prev('a').find('> i').toggle();
	});
	
	// Mobile helper
	$('.mobile-helper .button').click(function() {
		$('nav.mobile').eq($(this).index()).slideToggle().siblings('nav.mobile:visible').slideUp();
	});
	
	// Secondary navigation
	$('nav.secondary').each(function() {
		$('ul:first', this).movableContainer();
	});

	// LayerSlider
	if ($('#layer-slider').length > 0) {
		$.getScript(conf.templatePath+'/data/js/jquery.layerslider.min.js', function() {
			
			var ls          = $('#layer-slider');
			var backgrounds = $('#backgrounds');
			
			// Full screen
			if ($('body').hasClass('full-screen')) {
				var height = $(window).height()-ls.offset().top;
				ls.css('height', height);
				ls.closest('.container').css('max-height', height);
			}

			// Retina rescale (for old LayerSlider versions)
/*			if (dpr >= 2) {
				
				// Slider dimensions
				ls.css({
					width:  parseInt(ls.css('width'), 10)*2,
					height: parseInt(ls.css('height'), 10)*2
				});
				
				// Sub-layers position and scale
				var sub_layers = $('[class^="ls-s"][style], [class*=" ls-s"][style]', ls);
				sub_layers.attr('style', function() {
					return $(this).attr('style').replace(/(left|top): *([-0-9]+)px/g, function(_, dir, pos) {
						return dir+': '+(pos*2)+'px';
					});
				});
				sub_layers.filter('div, p, small, ul, ol, button').each(function() {
					var style = $(this).attr('style');
					$(this)
						.css({
							borderWidth:   parseInt($(this).css('border-width'), 10)*2,
							fontSize:      (parseInt($(this).css('font-size'), 10)*2)+'px',
							lineHeight:    (parseInt($(this).css('line-height'), 10)*2)+'px',
							paddingLeft:   parseInt($(this).css('padding-left'), 10)*2,
							paddingRight:  parseInt($(this).css('padding-right'), 10)*2,
							paddingTop:    parseInt($(this).css('padding-top'), 10)*2,
							paddingBottom: parseInt($(this).css('padding-bottom'), 10)*2,
							width:         parseInt($(this).css('width'), 10)*2,
							height:        parseInt($(this).css('height'), 10)*2
						})
						.attr('style', style+$(this).attr('style'));
				});
				$('iframe', sub_layers).each(function() {
					$(this).attr({
						width:  parseInt($(this).attr('width'), 10)*2,
						height: parseInt($(this).attr('height'), 10)*2
					});
				});

			}*/
			
			// LayerSlider
			ls.layerSlider($.extend({}, conf.layersliderOptions, {
				responsive:        !$('body').hasClass('full-screen'),
				animateFirstLayer: true,
				hoverPrevNext:     false,
				skinsPath:         conf.templatePath+'/data/img/layerslider/',
				durationIn:        0,
				durationOut:       0,
				cbInit:            function(ls) {
					
					// Prev, next
					var on_resize = function() {
						var pos = -Math.min($('.ls-nav-prev', ls).outerWidth(true), Math.max($(window).width()-ls.width(), 0)*0.5);
						$('.ls-nav-prev', ls).css('left', pos);
						$('.ls-nav-next', ls).css('right', pos);
					};
					$(window).resize(on_resize); on_resize();
					
					// Backgrounds
					$('.ls-layer', ls).each(function() {
						var bg    = $('<div />').appendTo(backgrounds);
						var ls_bg = $('.ls-bg[src]', this);
						if (ls_bg.length > 0) {
							bg
								.attr('class', ls_bg.attr('class'))
								.css('background-image', 'url('+ls_bg.attr('src')+')');
						} else {
							bg.addClass('ls-bg');
						}					
					});
					$('.ls-bg', backgrounds).eq(0).show();

					// Dev mode
					if (ls.hasClass('ls-dev-mode')) {
						$.getScript(conf.templatePath+'/data/js/jquery.ui.min.js', function() {
							var info_box = $('<div />', {'class': 'info-box'}).appendTo(ls);
							var updateInfoBox = function() {
								var s = parseInt(ls.parent().css('max-width'), 10) / ls.width();
								var x = Math.round($(this).position().left*s);
								var y = Math.round($(this).position().top*s);
								var name;
								if ($(this).is('img') || $(this).is(':has(img)')) {
									var src = $(this).is('img') ? $(this).attr('src') : $('img', this).attr('src');
									name = src.substring(src.lastIndexOf('/')+1);
								} else {
									name = '&lt;'+$(this).get(0).tagName.toLowerCase()+'&gt;';
								}
								info_box.html(name+': <strong>'+x+'px</strong> x <strong>'+y+'px</strong>');
							};
							$('[class^="ls-s"]', ls)
								.draggable({
									cancel: false,
									cursor: 'move',
									drag:   updateInfoBox,
									stop:   updateInfoBox
								})
								.mouseenter(updateInfoBox)
								.hover(function() {
									info_box.show();
								}, function() {
									info_box.hide();
								});
						});
					}

				},
				cbAnimStop:        function(data) {
					$('.ls-bg', backgrounds).eq(data.nextLayerIndex-1).stop(true).fadeIn(400).siblings('.ls-bg').stop(true).fadeOut(400);
				}
			}));
		});
			
	}
	
	// Social media
	if ($('.fb-like, .fb-like-box').length > 0) {
		$('body').prepend($('<div />', {id: 'fb-root'}));
		var lang = $('html').attr('lang');
		lang = lang.indexOf('_') == -1 ? lang.toLowerCase()+'_'+lang.toUpperCase() : lang.replace('-', '_');
		$.getScript('http://connect.facebook.net/'+lang+'/all.js#xfbml=1', function() { // http://developers.facebook.com/docs/reference/plugins/like/
			FB.init({status: true, cookie: true, xfbml: true});
		});
	}
	if ($('.twitter-share-button').length > 0) {
		$.getScript('http://platform.twitter.com/widgets.js'); // https://dev.twitter.com/docs/tweet-button
	}
	if ($('.g-plusone').length > 0) {
		$.getScript('https://apis.google.com/js/plusone.js'); // https://developers.google.com/+/plugins/+1button/
	}
	if ($('[data-pin-do]').length > 0) {
		$.getScript('http://assets.pinterest.com/js/pinit.js'); // http://business.pinterest.com/widget-builder/#do_pin_it_button
	}
	if ($('.inshare').length > 0) {
		$.getScript('http://platform.linkedin.com/in.js'); // http://developer.linkedin.com/plugins/share-plugin-generator
	}

});