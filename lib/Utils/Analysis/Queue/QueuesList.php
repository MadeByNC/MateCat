<?php
namespace Analysis\Queue;

/**
 * Created by PhpStorm.
 * @author domenico domenico@translated.net / ostico@gmail.com
 * Date: 02/12/15
 * Time: 17.00
 *
 */
class QueuesList {

    /**
     * Queues by priorities.
     * Lowest priority indexes have more priority ( 0 => Highest priority )
     *
     * <code>
     * array(
     *    0 => array(
     *          "pid_list_name"       => RedisKeys::VA_CHILD_PID_SET_DEFAULT,
     *          "redis_key"           => RedisKeys::PROJECTS_QUEUE_LIST_DEFAULT,
     *          "queue_name"          => RedisKeys::DEFAULT_QUEUE_NAME,
     *          "pid_list_perc_break" => 70
     *    ),
     *      1 => array(
     *          "pid_list_name"       => RedisKeys::VA_CHILD_PID_SET_P2,
     *          "redis_key"           => RedisKeys::PROJECTS_QUEUE_LIST_P2,
     *          "queue_name"          => RedisKeys::QUEUE_NAME_P2,
     *          "pid_list_perc_break" => 20
     *    ),
     *      2 => array(
     *          "pid_list_name"       => RedisKeys::VA_CHILD_PID_SET_P3,
     *          "redis_key"           => RedisKeys::PROJECTS_QUEUE_LIST_P3,
     *          "queue_name"          => RedisKeys::QUEUE_NAME_P3,
     *          "pid_list_perc_break" => 10
     *    ),
     * )
     * </code>
     *
     * @var array
     */
    protected static $_QUEUE_INFO = array(
            0 => array(
                    "pid_set_name"       => RedisKeys::VA_CHILD_PID_SET_DEFAULT,
                    "redis_key"          => RedisKeys::PROJECTS_QUEUE_LIST_DEFAULT,
                    "queue_name"         => RedisKeys::DEFAULT_QUEUE_NAME,
                    "pid_set_perc_break" => 70
            ),
            1 => array(
                    "pid_set_name"       => RedisKeys::VA_CHILD_PID_SET_P2,
                    "redis_key"          => RedisKeys::PROJECTS_QUEUE_LIST_P2,
                    "queue_name"         => RedisKeys::QUEUE_NAME_P2,
                    "pid_set_perc_break" => 20
            ),
            2 => array(
                    "pid_set_name"       => RedisKeys::VA_CHILD_PID_SET_P3,
                    "redis_key"          => RedisKeys::PROJECTS_QUEUE_LIST_P3,
                    "queue_name"         => RedisKeys::QUEUE_NAME_P3,
                    "pid_set_perc_break" => 10
            ),
    );

    /**
     * @var QueueInfo[]
     */
    public $list = array();

    /**
     * Analysis_Queue_Levels constructor.
     *
     * @param array $_queue_info
     */
    protected function __construct( Array $_queue_info ) {

        if ( !empty( $_queue_info ) ) {
            $queue_info = $_queue_info;
        } else {
            $queue_info = self::$_QUEUE_INFO;
        }

        foreach ( $queue_info as $level => $values ) {
            $this->list[ $level ] = QueueInfo::buildFromArray( $values );
        }

    }

    /**
     * @param array $queue_info
     *
     * @return static
     */
    public static function get( Array $queue_info = array() ) {
        return new static( $queue_info );
    }

}