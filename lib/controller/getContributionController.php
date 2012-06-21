<?php

/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
define('DEFAULT_NUM_RESULTS', 2);

class getContributionController extends ajaxcontroller {

    private $id_segment;
    private $num_results;
    private $text;

    public function __construct() {
        parent::__construct();

        $this->id_segment = $this->get_from_get_post('id_segment');
        $this->num_results = $this->get_from_get_post('num_results');
        $this->text = $this->get_from_get_post('text');
        
        $this->text=  str_replace("&nbsp;", " ", $this->text);
    }

    public function doAction() {
        if (empty($this->id_segment)) {
            $this->result['error'][] = array("code" => -1, "message" => "missing id_segment");
        }
        if (empty($this->id_segment)) {
            $this->result['error'][] = array("code" => -2, "message" => "missing text");
        }

        if (empty($this->num_results)) {
            $this->num_results = DEFAULT_NUM_RESULTS;
        }

        if (!empty($this->result['error'])) {
            return -1;
        }


        // UNUSED
        $fake_matches = array();
        $fake_matches[] = array("segment" => $this->text, "translation" => "$this->text fake translation", "quelity" => 74, "created_by" => "Vicky", "last_update_date" => "2011-08-21 14:30", "match" => 1);
        $fake_matches[] = array("segment" => $this->text, "translation" => "$this->text fake translation second result", "quelity" => 84, "created_by" => "Don", "last_update_date" => "2010-06-21 14:30", "match" => 0.84);
        //$matches = $fake_matches;

        $matches=array();
        $retMM = $this->getFromMM();
        foreach ($retMM as $r) {
            $matches[] = array("segment" => $this->text, "translation" => $r[0], "quelity" => $r[1], "created_by" => $r[2], "last_update_date" => $r[3], "match" => $r[4]);
            if (count($matches) > DEFAULT_NUM_RESULTS) {
                break;
            }
        }

        
        $this->result['data']['matches'] = $matches;
    }

    private function getFromMM() {
        $q = urlencode($this->text);
        $url = "http://mymemory.translated.net/api/get?q=$q&langpair=en|it";
        $res = file_get_contents($url);
        $res = json_decode($res, true);

        $ret = array();
        // print_r ($res['matches']);
        foreach ($res['matches'] as $match) {
            $ret[] = array($match['translation'], $match['quality'], $match['created-by'], $match['last-update-date'], $match['match']);
        }


        //print_r ($ret);
        return $ret;
    }

}

?>
