<?php
/**
 * @package Time_Template
 * @since Time 1.2
 *
 * Script responsible for acquiring and caching tweets.
 * Use the $config variable to define necessary parameters for it to work.
 */

// -----------------------------------------------------------------------------

// Configuration
$config = array(
	'host_validation' => true,           // prevents script being hotlinked
	'cache'           => array(
		'dir'        => './../../cache', // cache directory
		'expiration' => 30               // number of minutes between acquiring tweets
	),
	'oauth'           => array(
		'consumer_key'        => '',
		'consumer_secret'     => '',
		'access_token'        => '',
		'access_token_secret' => ''
	)
);

// -----------------------------------------------------------------------------

// Constants
define('TWITTER_API_URL', 'https://api.twitter.com/1.1/%s.%s'); // resource, format

// -----------------------------------------------------------------------------

/**
 * substr_replace for multibyte strings
 *
 * @param  string $str
 * @param  string $replacement
 * @param  int    $start
 * @param  int    $length
 * @return string
 */
function string_mb_substr_replace($str, $replacement, $start, $length)
{
	return mb_substr($str, 0, $start).$replacement.mb_substr($str, $start+$length);
}

// -----------------------------------------------------------------------------

/**
 * Request to twitter.com
 *
 * @link https://dev.twitter.com/docs/api/1.1
 *
 * @param  array             $oauth
 * @param  string            $resource
 * @param  array             $params
 * @return object|array|bool
 */
function twitter_request($oauth, $resource, $params = array())
{

	require_once 'oauth.php';

	// Consumer and token
	$consumer = new OAuthConsumer($oauth['consumer_key'], $oauth['consumer_secret']);
	$token    = new OAuthConsumer($oauth['access_token'], $oauth['access_token_secret']);

	// Authorized reqest
	$request = OAuthRequest::from_consumer_and_token($consumer, $token, 'GET', sprintf(TWITTER_API_URL, $resource, 'json'), $params);
	$request->sign_request(new OAuthSignatureMethod_HMAC_SHA1(), $consumer, $token);

	// Sending reqest
	$curl = curl_init();
	curl_setopt_array($curl, array(
		CURLOPT_URL            => $request->to_url(),
		CURLOPT_HEADER         => false,
		CURLOPT_RETURNTRANSFER => true,
		CURLOPT_SSL_VERIFYPEER => false
	));
	$body = curl_exec($curl);
	curl_close($curl);

	// Result
	if ($body === false) {
		return false;
	}
	if (($response = json_decode($body)) === null) {
		return false;
	}
	if (isset($response->errors)) {
		return false;
	}
	return $response;

}

// -----------------------------------------------------------------------------

/**
 * Get tweets from twitter.com
 *
 * @param  array      $oauth
 * @param  string     $username
 * @param  bool       $include_retweets
 * @param  bool       $exclude_replies
 * @param  int        $count
 * @return array|bool
 */
function twitter_get_tweets($oauth, $username, $include_retweets = true, $exclude_replies = false, $count = 20)
{

	// Request
	$params = array(
		'screen_name'      => $username,
		'include_rts'      => $include_retweets,
		'exclude_replies'  => $exclude_replies,
		'count'            => $include_retweets && !$exclude_replies ? min($count, 50) : 50, // API limit: 200
		'trim_user'        => false
	);
	if (($response = twitter_request($oauth, 'statuses/user_timeline', $params)) === false) {
		return false;
	}

	// Response
	$tweets = array();
	foreach ($response as $data) {

		// Entities
		$entities = array();
		foreach ($data->entities->hashtags as $hashtag) {
			$entities[$hashtag->indices[0]] = array(
				'type'   => 'hashtag',
				'length' => $hashtag->indices[1]-$hashtag->indices[0],
				'text'   => $hashtag->text
			);
		}
		foreach ($data->entities->user_mentions as $user_mention) {
			$entities[$user_mention->indices[0]] = array(
				'type'        => 'user_mention',
				'length'      => $user_mention->indices[1]-$user_mention->indices[0],
				'screen_name' => $user_mention->screen_name
			);
		}
		foreach ($data->entities->urls as $url) {
			$entities[$url->indices[0]] = array(
				'type'         => 'url',
				'length'       => $url->indices[1]-$url->indices[0],
				'url'          => $url->url,
				'expanded_url' => $url->expanded_url,
				'display_url'  => $url->display_url
			);
		}
		krsort($entities);
		$html = $text = (string)$data->text;
		foreach ($entities as $pos => $entity) {
			$len = $entity['length'];
			switch ($entity['type']) {
				case 'hashtag':
					$html = string_mb_substr_replace(
						$html,
						sprintf('<a href="http://twitter.com/#!/search?q=%%23%s" title="#%s">#%s</a>', $entity['text'], $entity['text'], $entity['text']),
						$pos, $len
					);
					break;
				case 'user_mention':
					$html = string_mb_substr_replace(
						$html,
						sprintf('<a href="http://twitter.com/#!/%s">@%s</a>', $entity['screen_name'], $entity['screen_name']),
						$pos, $len
					);
					break;
				case 'url':
					$html = string_mb_substr_replace(
						$html,
						sprintf('<a href="%s" title="%s">%s</a>', $entity['url'], $entity['expanded_url'], $entity['display_url']),
						$pos, $len
					);
					break;
			}
		}

		// Tweet
		$tweets[] = array(
			'id'   => $data->id_str,
			'date' => strtotime($data->created_at),
			'url'  => sprintf('http://twitter.com/%s/status/%s', $data->user->screen_name, $data->id_str),
			'text' => $text,
			'html' => $html
		);

		// Real tweets limit
		if (count($tweets) >= $count) {
			break;
		}

	}

	// Result
	return $tweets;

}

// -----------------------------------------------------------------------------

// Host validation
if ($config['host_validation']) {
	if (!isset($_SERVER['HTTP_REFERER']) || !preg_match('#^https?://'.preg_quote($_SERVER['HTTP_HOST'], '#').'(/|$)#i', $_SERVER['HTTP_REFERER'])) {
		exit;
	}
}

// Data validation
if (!isset($_GET['username'])) {
	exit;
}

// Cache file
if ($config['cache']['dir'] && is_dir($config['cache']['dir'])) {
	$cache_file = sprintf('%s/twitter_%s.txt', rtrim($config['cache']['dir'], '/'), md5(serialize($_GET)));
} else {
	$cache_file = false;
}

// Reading cache
if ($cache_file && file_exists($cache_file)) {
	if (($_cache = @file_get_contents($cache_file)) !== false) {
		if (($_cache = @unserialize($_cache)) !== false) {
			$cache = $_cache;
		}
	}
}

if (isset($cache) && $cache['timestamp']+$config['cache']['expiration']*60 >= time()) {

	// Retrieving tweets
	$tweets = $cache['tweets'];

} else {

	// Getting tweets
	$tweets = twitter_get_tweets(
		$config['oauth'],
		$_GET['username'],
		isset($_GET['include_retweets']) ? (bool)$_GET['include_retweets'] : true,
		isset($_GET['exclude_replies']) ? (bool)$_GET['exclude_replies'] : false,
		isset($_GET['count']) ? (int)$_GET['count'] : 3
	);

	if ($tweets !== false) {

		// Writing cache
		if ($cache_file) {
			@file_put_contents($cache_file, serialize(array(
				'timestamp' => time(),
				'tweets'    => $tweets
			)));
		}

	} else if (isset($cache)) {

		// Retrieving outdated tweets
		$tweets = $cache['tweets'];

	}

}

// Result
if ($tweets !== false) {
	echo json_encode($tweets);
}