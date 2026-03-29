package kv

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type Client struct {
	baseURL string
	token   string
	http    *http.Client
}

func New() (*Client, error) {
	baseURL := os.Getenv("KV_REST_API_URL")
	token := os.Getenv("KV_REST_API_TOKEN")
	if baseURL == "" || token == "" {
		return nil, fmt.Errorf("KV_REST_API_URL and KV_REST_API_TOKEN must be set")
	}
	return &Client{
		baseURL: baseURL,
		token:   token,
		http:    &http.Client{},
	}, nil
}

func (c *Client) doRaw(method, path string, body []byte) ([]byte, error) {
	var reqBody io.Reader
	if body != nil {
		reqBody = bytes.NewReader(body)
	}
	return c.doRequest(method, path, reqBody)
}

func (c *Client) do(method, path string, body interface{}) ([]byte, error) {
	var reqBody io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewReader(data)
	}
	return c.doRequest(method, path, reqBody)
}

func (c *Client) doRequest(method, path string, reqBody io.Reader) ([]byte, error) {
	req, err := http.NewRequest(method, c.baseURL+path, reqBody)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("KV request failed (status %d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

type kvResponse struct {
	Result interface{} `json:"result"`
}

func (c *Client) Get(key string) (string, error) {
	data, err := c.do("GET", "/get/"+key, nil)
	if err != nil {
		return "", err
	}

	var resp kvResponse
	if err := json.Unmarshal(data, &resp); err != nil {
		return "", err
	}

	if resp.Result == nil {
		return "", nil
	}

	switch v := resp.Result.(type) {
	case string:
		return v, nil
	default:
		b, _ := json.Marshal(v)
		return string(b), nil
	}
}

func (c *Client) Set(key, value string) error {
	_, err := c.doRaw("POST", "/set/"+key, []byte(value))
	return err
}

func (c *Client) SetWithTTL(key, value string, ttlSeconds int) error {
	_, err := c.doRaw("POST", fmt.Sprintf("/set/%s?EX=%d", key, ttlSeconds), []byte(value))
	return err
}

func (c *Client) Delete(key string) error {
	_, err := c.do("POST", "/del/"+key, nil)
	return err
}

func (c *Client) List(prefix string) ([]string, error) {
	path := "/keys/*"
	if prefix != "" {
		path = "/keys/" + prefix + "*"
	}

	data, err := c.do("GET", path, nil)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Result []string `json:"result"`
	}
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, err
	}

	return resp.Result, nil
}
